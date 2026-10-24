// Offline tests for the real analytics handlers in src/app/lib/analytics.ts.
// No network, no real PostHog client: an in-memory client records what the
// handlers would send. Run with `bun posthog-analytics.verify.mjs`.
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

import {
  CONSENT_STORAGE_KEY,
  createAnalytics,
  readAnalyticsConfig,
  scrubEvent,
  type AnalyticsClient,
  type ConsentDecision,
} from '../src/app/lib/analytics'

const syntheticToken = 'synthetic_project_token_local_only'
const syntheticHost = 'https://eu.i.posthog.com'
const env = { VITE_POSTHOG_PROJECT_TOKEN: syntheticToken, VITE_POSTHOG_HOST: syntheticHost }

// Deny network at the edge: any accidental fetch is a hard failure.
globalThis.fetch = (() => {
  throw new Error('network disabled in offline verification')
}) as unknown as typeof fetch

type CapturedEvent = { event: string; properties: Record<string, unknown> }

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}

function fakeClient(options: { failCapture?: boolean } = {}) {
  const calls = {
    init: [] as { token: string; config: Record<string, unknown> }[],
    capture: [] as CapturedEvent[],
    optIn: 0,
    optOut: 0,
    reset: 0,
  }
  const client: AnalyticsClient = {
    init(token: string, config?: unknown) {
      calls.init.push({ token, config: (config ?? {}) as Record<string, unknown> })
      return client
    },
    capture(event: string, properties?: Record<string, unknown> | null) {
      if (options.failCapture) throw new Error('transport down')
      calls.capture.push({ event, properties: (properties ?? {}) as Record<string, unknown> })
      return undefined
    },
    opt_in_capturing() {
      calls.optIn += 1
    },
    opt_out_capturing() {
      calls.optOut += 1
    },
    reset() {
      calls.reset += 1
    },
  } as unknown as AnalyticsClient
  return { client, calls }
}

function setup(initialConsent?: ConsentDecision) {
  const storage = memoryStorage(initialConsent ? { [CONSENT_STORAGE_KEY]: initialConsent } : {})
  const fake = fakeClient()
  const analytics = createAnalytics({ client: fake.client, env, storage })
  return { analytics, storage, ...fake }
}

describe('configuration', () => {
  test('missing token or host, or an unsafe host, keeps capture off', () => {
    expect(readAnalyticsConfig({})).toBeNull()
    expect(readAnalyticsConfig({ VITE_POSTHOG_PROJECT_TOKEN: syntheticToken })).toBeNull()
    expect(readAnalyticsConfig({ VITE_POSTHOG_HOST: syntheticHost })).toBeNull()
    expect(readAnalyticsConfig({ VITE_POSTHOG_PROJECT_TOKEN: syntheticToken, VITE_POSTHOG_HOST: 'http://eu.i.posthog.com' })).toBeNull()
    expect(readAnalyticsConfig({ VITE_POSTHOG_PROJECT_TOKEN: syntheticToken, VITE_POSTHOG_HOST: 'not a url' })).toBeNull()
  })

  test('the runner injects the synthetic token before imports', () => {
    const runtime = readAnalyticsConfig(import.meta.env as unknown as Record<string, string | undefined>)
    expect(runtime).toEqual({ token: syntheticToken, host: syntheticHost })
  })

  test('no token/host means the SDK is never initialised and nothing is sent', async () => {
    const fake = fakeClient()
    const analytics = createAnalytics({ client: fake.client, env: {}, storage: memoryStorage() })
    expect(await analytics.init()).toBe(false)
    expect(fake.calls.init.length).toBe(0)
    expect(analytics.projectOpened({ slug: 'aurora', index: 0, placement: 'home_grid' })).toBe(false)
    expect(analytics.emailClicked('nav')).toBe(false)
    expect(analytics.contactSubmitted()).toBe(false)
    expect(fake.calls.capture.length).toBe(0)
  })

  test('initialisation uses the documented privacy defaults and one client', async () => {
    const { analytics, calls } = setup('granted')
    expect(await analytics.init()).toBe(true)
    expect(await analytics.init()).toBe(true)
    expect(calls.init.length).toBe(1)
    const config = calls.init[0].config
    expect(calls.init[0].token).toBe(syntheticToken)
    expect(config.api_host).toBe(syntheticHost)
    expect(config.autocapture).toBe(false)
    expect(config.capture_pageview).toBe(false)
    expect(config.capture_pageleave).toBe(false)
    expect(config.capture_dead_clicks).toBe(false)
    expect(config.disable_session_recording).toBe(true)
    expect(config.disable_surveys).toBe(true)
    expect(config.advanced_disable_feature_flags).toBe(true)
    expect(config.person_profiles).toBe('identified_only')
    expect(config.opt_out_capturing_by_default).toBe(true)
    expect(typeof config.before_send).toBe('function')
  })
})

describe('consent', () => {
  test('no decision means off: client opts out by default and handlers send nothing', async () => {
    const { analytics, calls, storage } = setup()
    expect(await analytics.init()).toBe(true)
    expect(calls.optIn).toBe(0)
    expect(calls.optOut).toBe(0)
    expect(analytics.projectOpened({ slug: 'aurora', index: 0, placement: 'home_grid' })).toBe(false)
    expect(analytics.emailClicked('footer')).toBe(false)
    expect(analytics.contactSubmitted()).toBe(false)
    expect(calls.capture.length).toBe(0)
    expect(storage.map.size).toBe(0)
    expect(analytics.getConsent()).toBeNull()
  })

  test('a denied decision opts out at startup and blocks capture', async () => {
    const { analytics, calls } = setup('denied')
    expect(await analytics.init()).toBe(true)
    expect(calls.optOut).toBe(1)
    expect(calls.optIn).toBe(0)
    expect(analytics.projectOpened({ slug: 'aurora', index: 0, placement: 'home_grid' })).toBe(false)
    expect(calls.capture.length).toBe(0)
  })

  test('revoking consent stops capture and granting it resumes it', async () => {
    const { analytics, calls, storage } = setup('granted')
    expect(await analytics.init()).toBe(true)
    expect(calls.optIn).toBe(1)

    analytics.setConsent('denied')
    expect(storage.map.get(CONSENT_STORAGE_KEY)).toBe('denied')
    expect(calls.optOut).toBe(1)
    expect(analytics.projectOpened({ slug: 'aurora', index: 0, placement: 'home_grid' })).toBe(false)
    expect(calls.capture.length).toBe(0)

    analytics.setConsent('granted')
    expect(storage.map.get(CONSENT_STORAGE_KEY)).toBe('granted')
    expect(analytics.projectOpened({ slug: 'aurora', index: 0, placement: 'home_grid' })).toBe(true)
    expect(calls.capture.length).toBe(1)
  })

  test('unreadable consent storage stays off without throwing', async () => {
    const fake = fakeClient()
    const storage = {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('storage blocked')
      },
    }
    const analytics = createAnalytics({ client: fake.client, env, storage })
    expect(await analytics.init()).toBe(true)
    expect(analytics.getConsent()).toBeNull()
    expect(analytics.contactSubmitted()).toBe(false)
    expect(fake.calls.capture.length).toBe(0)
  })
})

describe('real handlers', () => {
  test('project_opened fires once with only allowlisted properties', async () => {
    const { analytics, calls } = setup('granted')
    await analytics.init()
    expect(analytics.projectOpened({ slug: 'aurora', index: 0, placement: 'home_grid' })).toBe(true)
    expect(calls.capture.length).toBe(1)
    expect(calls.capture[0]).toEqual({
      event: 'project_opened',
      properties: { project_slug: 'aurora', project_index: 0, placement: 'home_grid' },
    })
  })

  test('email_clicked and contact_submitted fire with their allowlist', async () => {
    const { analytics, calls } = setup('granted')
    await analytics.init()
    expect(analytics.emailClicked('footer')).toBe(true)
    expect(analytics.contactSubmitted()).toBe(true)
    expect(calls.capture.map((c) => c.event)).toEqual(['email_clicked', 'contact_submitted'])
    expect(calls.capture[0].properties).toEqual({ placement: 'footer' })
    expect(calls.capture[1].properties).toEqual({ form: 'footer_contact' })
  })

  test('personal data and unknown properties are never forwarded', async () => {
    const { analytics, calls } = setup('granted')
    await analytics.init()
    const leaky = {
      slug: 'meridian',
      index: 2,
      placement: 'next_project',
      email: 'visitor@example.com',
      password: 'hunter2',
      token: 'token_sentinel_do_not_send',
      card: '4242424242424242',
      message: 'private project details',
      url: 'https://example.com/private?q=secret',
    }
    expect(analytics.projectOpened(leaky as never)).toBe(true)
    expect(calls.capture.length).toBe(1)
    expect(calls.capture[0].properties).toEqual({
      project_slug: 'meridian',
      project_index: 2,
      placement: 'next_project',
    })
    const serialised = JSON.stringify(calls.capture)
    for (const sentinel of ['visitor@example.com', 'hunter2', 'token_sentinel_do_not_send', '4242424242424242', 'private project details', 'example.com']) {
      expect(serialised.includes(sentinel)).toBe(false)
    }
  })

  test('an oversized slug and an unknown placement are dropped', async () => {
    const { analytics, calls } = setup('granted')
    await analytics.init()
    analytics.projectOpened({ slug: 'x'.repeat(65), index: 1, placement: 'elsewhere' as never })
    expect(calls.capture[0].properties).toEqual({ project_index: 1 })
  })

  test('transport failures are swallowed and preserve handler results', async () => {
    const storage = memoryStorage({ [CONSENT_STORAGE_KEY]: 'granted' })
    const fake = fakeClient({ failCapture: true })
    const analytics = createAnalytics({ client: fake.client, env, storage })
    await analytics.init()
    expect(analytics.projectOpened({ slug: 'kite', index: 5, placement: 'home_grid' })).toBe(false)
    expect(analytics.contactSubmitted()).toBe(false)
    expect(fake.calls.capture.length).toBe(0)
    expect(fake.calls.init.length).toBe(1)
  })
})

describe('before_send scrubber', () => {
  test('drops automatic URL, referrer, UTM and person metadata', () => {
    const result = scrubEvent({
      uuid: 'uuid-1',
      event: 'project_opened',
      timestamp: new Date('2026-01-01T00:00:00Z'),
      properties: {
        distinct_id: 'anonymous-device-id',
        project_slug: 'halcyon',
        project_index: 3,
        placement: 'next_project',
        $current_url: 'https://example.com/work/halcyon?secret=1',
        $referrer: 'https://example.com/private',
        $referring_domain: 'example.com',
        utm_source: 'newsletter',
        $browser: 'Chrome',
        $set: { email: 'visitor@example.com' },
        $set_once: { name: 'Visitor' },
      },
      $set: { email: 'visitor@example.com' },
      $set_once: { name: 'Visitor' },
    })
    expect(result).not.toBeNull()
    expect(result?.event).toBe('project_opened')
    expect(result?.properties).toEqual({
      project_slug: 'halcyon',
      project_index: 3,
      placement: 'next_project',
      distinct_id: 'anonymous-device-id',
    })
    expect(result?.$set).toBeUndefined()
    expect(result?.$set_once).toBeUndefined()
    expect(JSON.stringify(result).includes('visitor@example.com')).toBe(false)
    expect(JSON.stringify(result).includes('example.com/work/halcyon')).toBe(false)
  })

  test('drops every event that is not on the allowlist', () => {
    expect(scrubEvent({ uuid: 'u', event: '$pageview', properties: { distinct_id: 'x' } })).toBeNull()
    expect(scrubEvent({ uuid: 'u', event: '$autocapture', properties: { distinct_id: 'x' } })).toBeNull()
    expect(scrubEvent({ uuid: 'u', event: '$opt_out', properties: { distinct_id: 'x' } })).toBeNull()
    expect(scrubEvent({ uuid: 'u', event: 'contact_submitted', properties: { distinct_id: 'x', form: 'footer_contact', email: 'a@b.c' } })?.properties).toEqual({
      form: 'footer_contact',
      distinct_id: 'x',
    })
  })
})

describe('identity', () => {
  test('stays anonymous and resets without losing consent', async () => {
    const { analytics, calls } = setup('granted')
    await analytics.init()
    analytics.projectOpened({ slug: 'fold', index: 2, placement: 'home_grid' })
    expect(calls.capture[0].properties.distinct_id).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(calls, 'identify')).toBe(false)

    analytics.resetIdentity()
    expect(calls.reset).toBe(1)
    expect(calls.optIn).toBe(2)

    analytics.resetIdentity()
    expect(calls.reset).toBe(2)
    expect(calls.capture.length).toBe(1)
  })
})

describe('repository pin', () => {
  const root = new URL('../', import.meta.url)
  const read = (path: string) => readFileSync(new URL(path, root), 'utf8')

  test('the importer manifest pins posthog-js 1.438.13', () => {
    const manifest = JSON.parse(read('package.json')) as { dependencies: Record<string, string> }
    expect(manifest.dependencies['posthog-js']).toBe('1.438.13')
  })

  test('the original bun lock resolves posthog-js 1.438.13', () => {
    const lock = read('bun.lock')
    expect(lock.includes('"posthog-js": ["posthog-js@1.438.13"')).toBe(true)
    expect(existsSync(new URL('bun.lock', root))).toBe(true)
  })

  test('no other package manager lock exists and the Worker has no SDK', () => {
    for (const other of ['yarn.lock', 'pnpm-lock.yaml', 'package-lock.json', 'bun.lockb']) {
      expect(existsSync(new URL(other, root))).toBe(false)
    }
    expect(read('src/worker/index.ts').toLowerCase().includes('posthog')).toBe(false)
  })

  test('changed source, example and note carry no token or secret literals', () => {
    const files = ['src/app/lib/analytics.ts', '.env.example', 'posthog-analytics.md']
    for (const file of files) {
      const content = read(file)
      expect(/(phc_|phx_)[A-Za-z0-9]{6,}/.test(content)).toBe(false)
    }
    const example = read('.env.example')
    expect(example.includes('VITE_POSTHOG_PROJECT_TOKEN=')).toBe(true)
    expect(example.includes('VITE_POSTHOG_HOST=')).toBe(true)
    expect(read('.gitignore').includes('.env.local')).toBe(true)
  })
})

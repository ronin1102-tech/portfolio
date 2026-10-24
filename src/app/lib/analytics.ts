import type { CaptureResult, PostHog, PostHogConfig } from 'posthog-js'

// One PostHog client for the whole app. Capture is off unless the project token
// and an https ingestion host are configured AND the visitor granted analytics
// consent from the footer. Every failure is swallowed: analytics never changes
// what the site does.

export type AnalyticsClient = Pick<
  PostHog,
  'init' | 'capture' | 'opt_in_capturing' | 'opt_out_capturing' | 'reset'
>

export type ConsentDecision = 'granted' | 'denied'
export type ProjectPlacement = 'home_grid' | 'next_project'
export type EmailPlacement = 'nav' | 'footer'

export const CONSENT_STORAGE_KEY = 'portfolio.analytics-consent'

// The complete allowlist. Anything not named here never leaves the browser.
const EVENT_PROPERTIES = {
  project_opened: ['project_slug', 'project_index', 'placement'],
  email_clicked: ['placement'],
  contact_submitted: ['form'],
} as const

const ALLOWED_VALUES: Record<string, readonly string[]> = {
  placement: ['home_grid', 'next_project', 'nav', 'footer'],
  form: ['footer_contact'],
}

export type AnalyticsEvent = keyof typeof EVENT_PROPERTIES
type SafeProperties = Record<string, string | number>

function safeProperties(event: AnalyticsEvent, input: Record<string, unknown>): SafeProperties {
  const properties: SafeProperties = {}
  for (const key of EVENT_PROPERTIES[event]) {
    const value = input[key]
    if (typeof value === 'string') {
      if (value.length === 0 || value.length > 64) continue
      const allowed = ALLOWED_VALUES[key]
      if (allowed && !allowed.includes(value)) continue
      properties[key] = value
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      properties[key] = value
    }
  }
  return properties
}

// before_send runs on every event the SDK wants to send, including its own
// automatic ones. Rebuilding the payload keeps the event name, the anonymous
// distinct_id and the allowlisted app properties, and drops the automatic URL,
// referrer, UTM, browser and person metadata. Unknown events are dropped.
export function scrubEvent(event: CaptureResult): CaptureResult | null {
  const name = event.event as AnalyticsEvent
  if (!Object.prototype.hasOwnProperty.call(EVENT_PROPERTIES, name)) return null
  const source = (event.properties ?? {}) as Record<string, unknown>
  const properties: SafeProperties = safeProperties(name, source)
  const distinctId = source.distinct_id
  if (typeof distinctId === 'string' && distinctId.length > 0) properties.distinct_id = distinctId
  return { event: name, uuid: event.uuid, timestamp: event.timestamp, properties }
}

export interface AnalyticsConfig {
  token: string
  host: string
}

export function readAnalyticsConfig(
  env: Record<string, string | undefined> = import.meta.env as unknown as Record<string, string | undefined>,
): AnalyticsConfig | null {
  const token = (env.VITE_POSTHOG_PROJECT_TOKEN ?? '').trim()
  const rawHost = (env.VITE_POSTHOG_HOST ?? '').trim()
  if (!token || !rawHost) return null
  try {
    const url = new URL(rawHost)
    if (url.protocol !== 'https:' || !url.hostname.includes('.')) return null
    return { token, host: url.origin }
  } catch {
    return null
  }
}

export interface AnalyticsOptions {
  client?: AnalyticsClient
  loadClient?: () => Promise<AnalyticsClient>
  env?: Record<string, string | undefined>
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
}

export interface Analytics {
  init(): Promise<boolean>
  projectOpened(input: { slug: string; index: number; placement: ProjectPlacement }): boolean
  emailClicked(placement: EmailPlacement): boolean
  contactSubmitted(): boolean
  getConsent(): ConsentDecision | null
  setConsent(decision: ConsentDecision): void
  resetIdentity(): void
}

async function loadPostHogClient(): Promise<AnalyticsClient> {
  const { default: posthog } = await import('posthog-js')
  return posthog
}

function browserStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function posthogConfig(config: AnalyticsConfig): Partial<PostHogConfig> {
  return {
    api_host: config.host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    disable_external_dependency_loading: true,
    person_profiles: 'identified_only',
    opt_out_capturing_by_default: true,
    before_send: scrubEvent,
  }
}

export function createAnalytics(options: AnalyticsOptions = {}): Analytics {
  const env = options.env ?? (import.meta.env as unknown as Record<string, string | undefined>)
  const storage = options.storage === undefined ? browserStorage() : options.storage
  const loadClient = options.loadClient ?? loadPostHogClient
  let client: AnalyticsClient | null = null
  let startup: Promise<boolean> | null = null

  function getConsent(): ConsentDecision | null {
    try {
      const value = storage?.getItem(CONSENT_STORAGE_KEY)
      return value === 'granted' || value === 'denied' ? value : null
    } catch {
      return null
    }
  }

  async function init(): Promise<boolean> {
    if (client) return true
    if (startup) return startup
    startup = (async () => {
      const config = readAnalyticsConfig(env)
      if (!config) return false
      let sdk = options.client
      if (!sdk) {
        try {
          sdk = await loadClient()
        } catch {
          return false
        }
      }
      try {
        sdk.init(config.token, posthogConfig(config))
      } catch {
        return false
      }
      client = sdk
      const decision = getConsent()
      try {
        if (decision === 'granted') sdk.opt_in_capturing({ captureEventName: false })
        else if (decision === 'denied') sdk.opt_out_capturing()
      } catch {
        // Consent plumbing failing must not break the page.
      }
      return true
    })()
    return startup
  }

  function capture(event: AnalyticsEvent, input: Record<string, unknown>): boolean {
    if (!client || getConsent() !== 'granted') return false
    try {
      client.capture(event, safeProperties(event, input))
      return true
    } catch {
      return false
    }
  }

  return {
    init,
    projectOpened({ slug, index, placement }) {
      return capture('project_opened', { project_slug: slug, project_index: index, placement })
    },
    emailClicked(placement) {
      return capture('email_clicked', { placement })
    },
    contactSubmitted() {
      return capture('contact_submitted', { form: 'footer_contact' })
    },
    getConsent,
    setConsent(decision) {
      try {
        storage?.setItem(CONSENT_STORAGE_KEY, decision)
      } catch {
        // Private mode or blocked storage: the decision still applies this session.
      }
      if (!client) return
      try {
        if (decision === 'granted') client.opt_in_capturing({ captureEventName: false })
        else client.opt_out_capturing()
      } catch {
        // Ignore transport/plumbing errors.
      }
    },
    resetIdentity() {
      if (!client) return
      try {
        // reset() also clears the SDK's stored consent, so re-apply ours.
        client.reset()
        if (getConsent() === 'granted') client.opt_in_capturing({ captureEventName: false })
      } catch {
        // Ignore.
      }
    },
  }
}

export const analytics = createAnalytics()

// The contact route end to end, minus the network: `fetch` is replaced with a
// recorder, so these assert the request Resend would actually receive, not just
// that a function returned 200.
import { afterEach, describe, expect, test } from 'bun:test'

import app from '../src/worker/index'

const realFetch = globalThis.fetch

type Sent = { url: string; method: string; headers: Record<string, string>; json: Record<string, unknown> }
let sent: Sent | null = null

function mockProvider(status = 200, body: unknown = { id: 'email_123' }) {
  sent = null
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent = {
      url: String(input),
      method: (init?.method ?? 'GET').toUpperCase(),
      headers: (init?.headers ?? {}) as Record<string, string>,
      json: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
    }
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
}

function env(over: Record<string, unknown> = {}) {
  return { ASSETS: { fetch: async () => new Response('asset') }, RESEND_API_KEY: 're_test_key', ...over } as never
}

function post(body: Record<string, unknown>, extra: { env?: never; ip?: string } = {}) {
  return app.request(
    '/api/contact',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': extra.ip ?? '203.0.113.7' },
      body: JSON.stringify(body),
    },
    extra.env ?? env(),
  )
}

const form = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'I would like to talk about audio.', website: '', elapsedMs: 6000 }

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('delivery', () => {
  test('a filled-in form is sent to Resend with reply-to the sender', async () => {
    mockProvider()
    const response = await post(form)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(sent?.url).toBe('https://api.resend.com/emails')
    expect(sent?.method).toBe('POST')
    expect(sent?.headers.authorization).toBe('Bearer re_test_key')
    expect(sent?.json.to).toEqual(['ronin1102@gmail.com'])
    expect(sent?.json.reply_to).toBe('ada@example.com')
    expect(sent?.json.subject).toBe('New enquiry from Ada Lovelace')
    expect(String(sent?.json.text)).toContain('I would like to talk about audio.')
    expect(String(sent?.json.text)).toContain('ada@example.com')
  })

  test('sender and recipient can be overridden by the environment', async () => {
    mockProvider()
    await post(form, { env: env({ CONTACT_FROM: 'Site <form@tracyweaver.dev>', CONTACT_TO: 'work@example.net' }) })

    expect(sent?.json.from).toBe('Site <form@tracyweaver.dev>')
    expect(sent?.json.to).toEqual(['work@example.net'])
  })

  test('the body is escaped, so a message cannot inject markup', async () => {
    mockProvider()
    await post({ ...form, message: '<script>alert(1)</script> & "quotes"' })

    expect(String(sent?.json.html)).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;')
    expect(String(sent?.json.html)).not.toContain('<script>')
  })

  test('a newline in the name cannot become an extra mail header', async () => {
    mockProvider()
    await post({ ...form, name: 'Ada\r\nBcc: someone@example.org' })

    expect(sent?.json.subject).toBe('New enquiry from Ada Bcc: someone@example.org')
    expect(String(sent?.json.subject)).not.toMatch(/[\r\n]/)
  })
})

describe('validation', () => {
  test('an invalid address is rejected and nothing is sent', async () => {
    mockProvider()
    const response = await post({ ...form, email: 'not-an-email' })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Enter a valid email address.' })
    expect(sent).toBeNull()
  })

  test('an empty message is rejected with the same wording as before', async () => {
    mockProvider()
    const response = await post({ ...form, message: '   ' })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Write a few words about the project.' })
    expect(sent).toBeNull()
  })

  test('an over-long message is rejected rather than truncated silently', async () => {
    mockProvider()
    const response = await post({ ...form, message: 'x'.repeat(4001) })

    expect(response.status).toBe(400)
    expect(sent).toBeNull()
  })

  test('a body that is not JSON is rejected without crashing', async () => {
    mockProvider()
    const response = await app.request(
      '/api/contact',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'not json' },
      env(),
    )

    expect(response.status).toBe(400)
    expect(sent).toBeNull()
  })
})

describe('spam', () => {
  test('a filled honeypot looks successful but sends nothing', async () => {
    mockProvider()
    const response = await post({ ...form, website: 'https://cheap-watches.example' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(sent).toBeNull()
  })

  test('a submission faster than a person could type is dropped', async () => {
    mockProvider()
    const response = await post({ ...form, elapsedMs: 40 })

    expect(response.status).toBe(200)
    expect(sent).toBeNull()
  })

  test('the rate limiter is consulted per address and blocks the sixth attempt', async () => {
    mockProvider()
    const keys: string[] = []
    const limiter = {
      limit: async ({ key }: { key: string }) => {
        keys.push(key)
        return { success: false }
      },
    }

    const response = await post(form, { env: env({ CONTACT_RATE_LIMIT: limiter }) })

    expect(response.status).toBe(429)
    expect(keys).toEqual(['contact:203.0.113.7'])
    expect(sent).toBeNull()
  })

  test('a missing limiter binding does not break the route', async () => {
    mockProvider()
    const response = await post(form)

    expect(response.status).toBe(200)
  })
})

describe('failure handling', () => {
  test('no API key answers 503 with the address to use instead, and sends nothing', async () => {
    mockProvider()
    const response = await post(form, { env: env({ RESEND_API_KEY: undefined }) })
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(503)
    expect(body.error).toContain('ronin1102@gmail.com')
    expect(sent).toBeNull()
  })

  test('a provider rejection becomes a 502 that does not leak the provider reason', async () => {
    mockProvider(403, { message: 'The domain is not verified for this account.' })
    const response = await post(form)
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(502)
    expect(body.error).not.toContain('domain is not verified')
    expect(body.error).toContain('ronin1102@gmail.com')
  })
})

// Setting the key up is the step that goes wrong, and the provider's own words
// cannot be shown to the public. These pin the read-back that replaces the log.
describe('diagnostics', () => {
  async function health(over: Record<string, unknown> = {}) {
    const response = await app.request('/api/health', {}, env(over))
    return (await response.json()) as {
      ok: boolean
      mail: { connected: boolean; last: { ok: boolean; status?: number; reason?: string } | null }
    }
  }

  test('a rejection is remembered as a fixed reason, not the provider text', async () => {
    mockProvider(403, {
      message: 'You can only send testing emails to your own email address (owner@example.net). To send emails to other recipients…',
    })
    await post(form)

    expect((await health()).mail.last).toMatchObject({ ok: false, status: 403, reason: 'recipient-not-allowed' })
  })

  test('the reasons distinguish a bad key, an unverified sender and a rate limit', async () => {
    const cases: [number, string, string][] = [
      [401, 'Missing API key', 'key-rejected'],
      [403, 'The example.dev domain is not verified. Please add and verify your domain.', 'sender-domain-unverified'],
      [422, 'Invalid `to` field', 'request-rejected'],
      [429, 'Too many requests', 'rate-limited'],
      [500, 'Internal error', 'provider-error'],
    ]

    for (const [status, message, reason] of cases) {
      mockProvider(status, { message })
      await post(form)
      expect((await health()).mail.last?.reason).toBe(reason)
    }
  })

  test('a successful send clears the last failure and reports the key as connected', async () => {
    mockProvider(403, { message: 'Missing API key' })
    await post(form)
    mockProvider()
    await post(form)

    const body = await health()
    expect(body.mail.connected).toBe(true)
    expect(body.mail.last).toMatchObject({ ok: true })
    expect(body.mail.last?.reason).toBeUndefined()
  })

  test('with no key, health says so before anyone tries the form', async () => {
    mockProvider()
    await post(form, { env: env({ RESEND_API_KEY: undefined }) })

    const body = await health({ RESEND_API_KEY: undefined })
    expect(body.ok).toBe(true)
    expect(body.mail.connected).toBe(false)
  })
})

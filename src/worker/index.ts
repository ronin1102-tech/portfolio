import { Hono } from 'hono'

import { site } from '../data/site'

type RateLimiter = { limit: (options: { key: string }) => Promise<{ success: boolean }> }

type Env = {
  ASSETS: Fetcher
  /** Resend API key. A Worker secret, never a build variable. */
  RESEND_API_KEY?: string
  /** Sender. The sandbox sender only reaches the Resend account's own inbox. */
  CONTACT_FROM?: string
  /** Where enquiries land. Defaults to the address the site already publishes. */
  CONTACT_TO?: string
  /** Absent on hosts that cannot provide it, so every call is guarded. */
  CONTACT_RATE_LIMIT?: RateLimiter
}

const MAX_NAME = 80
const MAX_EMAIL = 200
const MAX_MESSAGE = 4000

/** A form filled in faster than this was not filled in by a person. */
const MIN_FILL_MS = 1200

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))

type Form = { name?: string; email?: string; message?: string; website?: string; elapsedMs?: number }

app.post('/api/contact', async (c) => {
  // A body that will not parse is a broken client, not a bot to be humoured:
  // say so rather than answering 200 and dropping a real message.
  let body: Form
  try {
    body = await c.req.json<Form>()
  } catch {
    return c.json({ error: 'Could not read that. Please send the form again.' }, 400)
  }

  // Two signals that a bot filled the form: a field no person can see, and a
  // submission that arrived faster than anyone could type one. Both answer 200
  // and drop the message — telling a script it failed only helps it retry.
  const trapped = Boolean(body.website?.trim()) || (body.elapsedMs ?? 0) < MIN_FILL_MS
  if (trapped) return c.json({ ok: true })

  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > MAX_EMAIL) {
    return c.json({ error: 'Enter a valid email address.' }, 400)
  }
  if (!body.message?.trim()) return c.json({ error: 'Write a few words about the project.' }, 400)
  if (body.message.length > MAX_MESSAGE) {
    return c.json({ error: 'That message is too long — trim it a little and try again.' }, 400)
  }

  const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
  const limiter = c.env.CONTACT_RATE_LIMIT
  if (limiter && !(await limiter.limit({ key: `contact:${ip}` })).success) {
    return c.json({ error: 'That is a few messages in a row. Try again in a minute.' }, 429)
  }

  const apiKey = c.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return c.json({ error: `The form is not connected yet — email me at ${site.email} and I will reply.` }, 503)
  }

  const name = (body.name ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_NAME) || 'Someone'
  const email = body.email.trim()
  const message = body.message.trim()

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: c.env.CONTACT_FROM?.trim() || 'Portfolio <onboarding@resend.dev>',
      to: [c.env.CONTACT_TO?.trim() || site.email],
      reply_to: email,
      subject: `New enquiry from ${name}`,
      text: `${name} <${email}>\n\n${message}\n\n— sent from ${site.name}'s contact form`,
      html: html(name, email, message),
    }),
  })

  if (!response.ok) {
    // Provider detail stays in the log: it can name the account and the reason.
    console.error('[contact] resend rejected the message', response.status, (await response.text()).slice(0, 500))
    return c.json({ error: `Could not send that. Try again, or email me at ${site.email}.` }, 502)
  }

  const { id } = (await response.json().catch(() => ({ id: undefined }))) as { id?: string }
  console.info('[contact] sent', id ?? '(no id)')
  return c.json({ ok: true })
})

/** Everything from the form is untrusted text, so it is escaped before it is markup. */
function escape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function html(name: string, email: string, message: string) {
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
  <p style="margin:0 0 4px"><strong>${escape(name)}</strong></p>
  <p style="margin:0 0 20px"><a href="mailto:${escape(email)}" style="color:#3b45b8">${escape(email)}</a></p>
  <p style="margin:0;white-space:pre-wrap">${escape(message)}</p>
</div>`
}

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app

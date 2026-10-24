import { useRef, useState, type FormEvent } from 'react'

import { site } from '../../data/site'
import { analytics, type ConsentDecision } from '../lib/analytics'
import { ArrowOut } from './icons'
import { Lines, Magnetic, Reveal } from './motion'
import { useLocalTime } from './Nav'

export function Footer() {
  const time = useLocalTime()
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [consent, setConsent] = useState<ConsentDecision | null>(() => analytics.getConsent())
  // The Worker drops anything submitted faster than a person could type it.
  const openedAt = useRef(Date.now())

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    const payload = { ...form, elapsedMs: Date.now() - openedAt.current }
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    if (response.ok) {
      analytics.contactSubmitted()
      setState('done')
    }
    else {
      setState('error')
      setError(((await response.json()) as { error?: string }).error ?? 'Something went wrong.')
    }
  }

  const field = 'h-14 w-full rounded-control border border-line-strong bg-transparent px-5 text-[15px] placeholder:text-faint transition-colors focus:border-fg focus:outline-none'

  return (
    <footer id="contact" className="mt-32 border-t border-line sm:mt-44">
      <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
          <div>
            <Lines as="h2" className="font-display text-[clamp(48px,8vw,120px)]" lines={['Let’s make', <>something <span className="text-accent">good</span></>]} />
            <Reveal delay={0.2} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Magnetic>
                <a href={`mailto:${site.email}`} onClick={() => analytics.emailClicked('footer')} className="inline-flex h-14 items-center gap-2 rounded-[16px] bg-fg px-7 text-[16px] font-medium text-bg transition-colors hover:bg-accent">
                  {site.email}
                  <ArrowOut className="size-4" />
                </a>
              </Magnetic>
              <p className="text-[14px] text-muted">
                {site.available ? 'Open to full-time engineering roles' : 'Not looking right now'}
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            {state === 'done' ? (
              <div className="flex h-full min-h-[320px] flex-col justify-center rounded-card bg-surface-2/60 p-8">
                <p className="font-display text-[36px]">Thank you</p>
                <p className="mt-2 text-[15px] text-muted">I read everything myself and reply within two days.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="relative flex flex-col gap-3">
                {/* Honeypot: off-screen, skipped by keyboard and screen readers.
                    People never see it; the scripts that fill every input do. */}
                <div className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required maxLength={80} placeholder="Your name" className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input required type="email" maxLength={200} placeholder="Email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <textarea
                  required
                  maxLength={4000}
                  placeholder="A few words about the project"
                  className={`${field} h-auto min-h-[140px] resize-none py-4`}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <button type="submit" disabled={state === 'sending'} className="h-14 rounded-control border border-fg text-[15px] font-medium transition-colors hover:bg-fg hover:text-bg disabled:opacity-50">
                  Send
                </button>
                {state === 'error' && <p className="text-[13px] text-accent">{error}</p>}
              </form>
            )}
          </Reveal>
        </div>

        <div className="mt-24 grid gap-8 border-t border-line pt-8 text-[14px] sm:grid-cols-3">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {site.socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} className="link-draw text-muted transition-colors hover:text-fg">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-faint sm:text-center">
            {site.location}, {time}
          </p>
          <div className="text-faint sm:text-right">
            <p>© {new Date().getFullYear()} {site.name}</p>
            <button
              type="button"
              onClick={() => {
                const next = consent === 'granted' ? 'denied' : 'granted'
                analytics.setConsent(next)
                setConsent(next)
              }}
              aria-pressed={consent === 'granted'}
              className="mt-2 text-[13px] underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg"
            >
              Analytics: {consent === 'granted' ? 'on' : 'off'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

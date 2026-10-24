import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'

import { alsoBuilt, projects, services, site, testimonials } from '../../data/site'
import { ArrowOut, Plus } from '../components/icons'
import { Lines, Magnetic, Reveal } from '../components/motion'
import { Portrait } from '../components/Portrait'
import { WorkCard } from '../components/WorkCard'
import { cx } from '../lib/cx'

const ease = [0.22, 1, 0.36, 1] as const

export function Home() {
  const years = projects.map((p) => Number(p.year))
  const from = Math.min(...years)
  const to = Math.max(...years)

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <HeroField />
        <div className="relative mx-auto w-full max-w-[1400px] px-5 pb-10 pt-28 sm:px-8 sm:pb-14">
          <h1 className="font-display text-[clamp(64px,13.5vw,210px)]">
            {site.name.split(' ').map((word, i) => (
              <span key={word} className="block overflow-hidden pb-[0.06em] -mb-[0.06em]">
                <motion.span className="block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.25 + i * 0.12, ease }}>
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.7, ease }} className="mt-10 border-t border-fg/15 pt-6">
            <p className="max-w-md text-pretty text-[17px] leading-relaxed text-muted sm:text-[19px]">{site.intro}</p>
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y border-line py-5" aria-hidden>
        <ul className="font-display flex w-max animate-marquee items-center gap-10 whitespace-nowrap text-[28px] text-fg/70 sm:text-[36px]">
          {[...site.marquee, ...site.marquee].map((item, i) => (
            <li key={i} className="flex items-center gap-10">
              {item}
              <span className="round size-2 rounded-full bg-accent" />
            </li>
          ))}
        </ul>
      </div>

      {/* Work */}
      <section id="work" className="mx-auto max-w-[1400px] scroll-mt-20 px-5 pt-24 sm:px-8 sm:pt-32">
        <div className="flex items-end justify-between">
          <Lines as="h2" className="font-display text-[44px] sm:text-[64px]" lines={['Selected work']} />
          <Reveal className="hidden text-[14px] text-muted sm:block">
            {projects.length} projects, {from === to ? from : `${from} to ${to}`}
          </Reveal>
        </div>
        <div className="mt-12 grid gap-x-6 gap-y-14 md:grid-cols-2 lg:gap-x-8 lg:gap-y-20">
          {projects.map((p, i) => (
            <WorkCard key={p.slug} project={p} index={i} />
          ))}
        </div>
        <Reveal className="mt-12 border-t border-line pt-6 text-[14.5px] text-muted">{alsoBuilt}</Reveal>
      </section>

      {/* About teaser */}
      <section className="mx-auto max-w-[1400px] px-5 pt-32 sm:px-8 sm:pt-44">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <Reveal>
            <Portrait />
          </Reveal>
          <div className="flex flex-col justify-center">
            <Lines
              as="h2"
              className="font-display text-balance text-[40px] sm:text-[56px] lg:text-[64px]"
              lines={['Real-time audio,', 'local-first software,', 'both shipped']}
            />
            <Reveal delay={0.2} className="mt-8 max-w-xl text-pretty text-[17px] leading-relaxed text-muted">
              <p>
                Audio means C++ and JUCE: DSP, plugin architecture and the unglamorous work that keeps a session from glitching. Local-first means Tauri, Rust and a hard rule that your notes, PDFs and drafts stay on your machine instead of someone else’s server.
              </p>
              <p className="mt-4">I run Solstice Audio, a plugin suite written in C++20, from {site.location}.</p>
            </Reveal>
            <Reveal delay={0.3} className="mt-8">
              <Link to="/about" className="link-draw inline-flex items-center gap-1.5 text-[15px] font-medium">
                More about me
                <ArrowOut className="size-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-[1400px] px-5 pt-32 sm:px-8 sm:pt-44">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <Lines as="h2" className="font-display text-[40px] sm:text-[56px]" lines={['What I do']} />
            <Reveal delay={0.1} className="mt-4 max-w-xs text-[15px] text-muted">
              Three things, done properly. Most projects are two of them.
            </Reveal>
          </div>
          <Services />
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-5 pt-32 sm:px-8 sm:pt-44">
          <Testimonials />
        </section>
      )}
    </>
  )
}

// The hero is lit rather than tinted, from a source just outside the right
// edge. The rigs themselves are the `.hero-key` and `.hero-warm` gradient
// stacks — see styles.css for the layers and why they are single surfaces.
// Painted on `screen` so overlapping light adds up the way it does in a room,
// and oversized so the blur has no hard edge to clip against.
function HeroField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease }}
        className="hero-key round absolute inset-[-14%] animate-light-drift mix-blend-screen"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.3, ease }}
        className="hero-warm round absolute inset-[-14%] animate-light-drift mix-blend-screen"
      />
      <div className="grain absolute inset-0" />
    </div>
  )
}

function Services() {
  const [open, setOpen] = useState(0)
  return (
    <ul className="border-t border-line">
      {services.map((s, i) => {
        const isOpen = open === i
        return (
          <li key={s.title} className="border-b border-line">
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)} className="group flex w-full items-center gap-6 py-7 text-left">
              <span className="w-10 shrink-0 text-[14px] tabular-nums text-faint">0{i + 1}</span>
              <span className={cx('font-display flex-1 text-[32px] transition-colors sm:text-[44px]', isOpen ? 'text-fg' : 'text-fg/60 group-hover:text-fg')}>{s.title}</span>
              <span className={cx('grid size-10 shrink-0 place-items-center rounded-[12px] border border-line-strong transition-colors duration-300', isOpen && 'border-fg bg-fg text-bg')}>
                <Plus className={cx('size-4 transition-transform duration-500', isOpen && 'rotate-45')} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease }} className="overflow-hidden">
                  <p className="max-w-xl pb-8 pl-16 text-pretty text-[16px] leading-relaxed text-muted">{s.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        )
      })}
    </ul>
  )
}

function Testimonials() {
  const [index, setIndex] = useState(0)
  const t = testimonials[index]
  if (!t) return null
  return (
    <div className="rounded-[32px] border border-line bg-surface px-6 py-14 sm:px-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <AnimatePresence mode="wait">
          <motion.blockquote key={index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }}>
            <p className="font-display text-balance text-[30px] leading-[1.1] sm:text-[44px]">“{t.quote}”</p>
            <footer className="mt-8 text-[15px] text-muted">
              <span className="text-fg">{t.name}</span>, {t.role}
            </footer>
          </motion.blockquote>
        </AnimatePresence>
        <div className="mt-10 flex items-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Testimonial ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cx('h-1.5 rounded-[3px] transition-all duration-500', i === index ? 'w-10 bg-fg' : 'w-4 bg-fg/25 hover:bg-fg/45')}
            />
          ))}
          <Magnetic className="ml-auto">
            <button type="button" onClick={() => setIndex((index + 1) % testimonials.length)} className="grid size-12 place-items-center rounded-[14px] border border-line-strong transition-colors hover:bg-fg hover:text-bg" aria-label="Next">
              <ArrowOut className="size-4 rotate-45" />
            </button>
          </Magnetic>
        </div>
      </div>
    </div>
  )
}

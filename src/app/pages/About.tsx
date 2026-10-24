import { experience } from '../../data/site'
import { Lines, Reveal } from '../components/motion'
import { Portrait } from '../components/Portrait'

export function About() {
  return (
    <article className="mx-auto max-w-[1400px] px-5 pt-28 sm:px-8 sm:pt-36">
      <Lines as="h1" className="font-display text-balance text-[clamp(44px,7.5vw,112px)]" lines={['Software engineer,', 'audio DSP and', 'local-first tools']} />
      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-24">
        <Reveal>
          <Portrait links />
        </Reveal>
        <div>
          <Reveal className="text-pretty text-[19px] leading-relaxed sm:text-[22px]">
            <p>
              I write software that runs on your machine: audio plugins in C++, and tools that keep your data where you left it.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 flex flex-col gap-5 text-[17px] leading-relaxed text-muted">
            <p>
              The work splits roughly in two. Solstice Audio is a suite of audio plugins written in C++20 on JUCE — effects, instruments, and the shared DSP and interface libraries underneath them. The other half is local-first: a macOS PDF workspace in Tauri and Rust, an offline grammar checker, and an MCP server for notes where an agent can only propose changes.
            </p>
            <p>
              I build the tools I want to use, then use them daily. That is the review that has changed my mind most often, and it is why the trade-offs in these projects are about latency and file ownership rather than features.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mt-16">
            <h2 className="text-[14px] text-muted">Experience</h2>
            <ol className="mt-4 divide-y divide-line border-y border-line">
              {experience.map((e) => (
                <li key={e.title} className="grid gap-1 py-5 sm:grid-cols-[160px_1fr]">
                  <span className="text-[14px] tabular-nums text-faint">{e.period}</span>
                  <span>
                    <span className="block text-[16px] font-medium">{e.title}</span>
                    <span className="block text-[14.5px] text-muted">{e.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>

        </div>
      </div>
    </article>
  )
}

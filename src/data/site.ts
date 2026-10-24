// Everything about you lives here. The pages read from this file.

export const site = {
  name: 'Tracy Weaver',
  role: 'Software engineer — audio DSP & local-first tools',
  location: 'Cleveland, Ohio',
  timezone: 'America/New_York',
  email: 'ronin1102@gmail.com',
  available: true,
  intro:
    'I build audio software and local-first tools: real-time C++ and JUCE on one side, Tauri, Rust and MCP on the other. Mostly for people who would rather own their data than rent it.',
  socials: [
    { label: 'GitHub', href: 'https://github.com/ronin1102-tech' },
    { label: 'Instagram', href: 'https://instagram.com/solsticeaudio_dsp' },
  ],
  marquee: ['Audio DSP', 'Real-Time C++', 'Local-First Tools', 'Desktop Apps', 'Developer Tooling', 'JUCE'],
}

export interface Project {
  slug: string
  title: string
  client: string
  category: string
  year: string
  cover: string
  /** Two 4:3 images for the case study; the cover is 1:1 and gets cropped. */
  details: [string, string]
  tint: string
  summary: string
  role: string[]
  deliverables: string[]
  link?: string
  linkLabel?: string
  body: string[]
  size: 'large' | 'small'
}

export const projects: Project[] = [
  {
    slug: 'solstice-audio',
    title: 'Solstice Audio',
    client: 'Solstice Audio',
    category: 'Audio software',
    year: '2026',
    cover: '/images/solstice-audio.svg',
    details: ['/images/solstice-audio-detail-1.svg', '/images/solstice-audio-detail-2.svg'],
    tint: '#17141f',
    summary:
      'A suite of VST3, AU and standalone audio plugins written in C++20 on JUCE: EQ, delay, reverb, dynamics, saturation and instruments, sharing one DSP core.',
    role: ['DSP architecture', 'Plugin interfaces', 'Build and test tooling'],
    deliverables: ['VST3, AU and standalone builds', 'Shared engine library and UI kit', 'JUCE-free EQ test suite'],
    body: [
      'Solstice Audio is a suite of plugins written in C++20 on top of JUCE and shipped as VST3, AU and standalone builds. One CMake tree, every plugin as its own target, so a change to shared code either breaks all of them or is made once. The collection covers the working parts of a mix: a parametric EQ with dynamic bands, mid/side and slopes up to 48 dB per octave, a tempo-syncing delay, a spatial reverb, a compressor-saturator-limiter chain, four flavours of harmonic saturation, a sixteen-voice synth, and sample-based instruments.',
      'The interesting work is the part nobody sees. A header-only UI kit holds the look and feel, presets and the sample browser; a static engine library holds whatever more than one plugin needs. The EQ core is deliberately written without JUCE so it compiles and runs as plain C++ in about two seconds, and a mutation-testing pass fails the build if a mutant survives. Shared state is what makes a suite feel like a suite instead of thirteen unrelated downloads.',
      'Two pieces stay closed: the Astro instrument and the Orbit channel strip are flagship products, named here and nowhere else — no architecture, no parameters, no screenshots. The rest of the collection is being separated into public repositories, which is why the suite still lives behind one door.',
    ],
    size: 'large',
  },
  {
    slug: 'solsticedocs',
    title: 'SolsticeDocs',
    client: 'Self-initiated',
    category: 'Desktop app',
    year: '2026',
    cover: '/images/solsticedocs.svg',
    details: ['/images/solsticedocs-detail-1.svg', '/images/solsticedocs-detail-2.svg'],
    tint: '#141826',
    summary:
      'A local-first macOS PDF workspace for coursework: annotations that leave the original file untouched, SQLite on disk, and no network at runtime.',
    role: ['Product design', 'React frontend', 'Rust storage core'],
    deliverables: ['macOS app shell', 'SQLite schema and migrations', 'IPC layer between Rust and React'],
    link: 'https://github.com/ronin1102-tech/SolsticeDocs',
    linkLabel: 'View on GitHub',
    body: [
      'SolsticeDocs is a PDF workspace for people whose coursework arrives as a hundred scanned files. It is a Tauri 2 app: a React 19 frontend, a Rust shell, and SQLite for everything that persists. Local-first is a build rule here rather than a slogan — no CDN assets, no webfonts, no telemetry, no updater calling home — so the application behaves the same on a plane as it does online.',
      'The storage core is the part worth reading. Bundled rusqlite, WAL journaling, migrations keyed on user_version, tables for documents, annotations and coursework, and an async SHA-256 import path so large files never block the interface. Every native call crosses a single IPC seam, which also means the whole frontend runs in Chrome against a shim. That was a practical decision, not a preference: the build machine is on an old macOS where the webview renders white, an upstream bug recorded in an ADR instead of papered over.',
      'Phase three is closed as well: annotations are written non-destructively, so the file you imported is never the file being edited, and export stamps a separate annotated copy. Phase two’s p50 and p95 timings on the IPC commands still hold, and the import → annotate → relaunch → export path was checked on the target hardware rather than only in a headless harness — which is how a letter-sized geometry assumption in the export got caught on real A4 coursework.',
    ],
    size: 'small',
  },
  {
    slug: 'local-writing-assistant',
    title: 'Local Writing Assistant',
    client: 'Self-initiated',
    category: 'Privacy tooling',
    year: '2026',
    cover: '/images/local-writing-assistant.svg',
    details: ['/images/local-writing-assistant-detail-1.svg', '/images/local-writing-assistant-detail-2.svg'],
    tint: '#131c17',
    summary:
      'A grammar checker that keeps your drafts on your machine: LanguageTool on localhost, a launcher that manages it, and a Chrome extension that suggests rather than rewrites.',
    role: ['Systems integration', 'Chrome extension', 'Install and launcher tooling'],
    deliverables: ['Pinned, checksum-verified engine setup', 'Double-clickable launcher', 'Chrome MV3 extension'],
    link: 'https://github.com/ronin1102-tech/grammar-tool',
    linkLabel: 'View on GitHub',
    body: [
      'Most grammar checkers work by sending your half-finished draft to somebody else’s server. This one does not. LanguageTool runs on a pinned JDK, bound to localhost only, and nothing leaves the machine — a property you can verify in the build rather than a promise in a privacy policy.',
      'Three pieces hold it together. The engine: installed by a script that downloads exact pinned versions, checksums both artifacts, patches the JDK for the older macOS target, then boots the server and runs one real grammar check as a smoke test. The launcher: a double-clickable applet that starts the engine, reports when it is ready, and offers stop or restart on reopening. The extension: a thin MV3 client that pulls the text out of the field you are editing, underlines findings, and applies a fix only when you click it.',
      'It runs on macOS 10.15 and the last Chrome that supports it, with no admin password — a tarball JDK instead of a cask, nothing installed system-wide. Getting there was most of the work, and the install path is as much the product as the checker is.',
    ],
    size: 'small',
  },
  {
    slug: 'mnemo',
    title: 'Mnemo',
    client: 'Self-initiated',
    category: 'Developer tooling',
    year: '2026',
    cover: '/images/mnemo.svg',
    details: ['/images/mnemo-detail-1.svg', '/images/mnemo-detail-2.svg'],
    tint: '#1e1611',
    summary:
      'A local-first second brain: notes stay as plain Markdown in a folder you own, and AI agents can only propose changes. A human decides what lands.',
    role: ['Protocol design', 'Safety model', 'Canvas interface'],
    deliverables: ['MCP server and admin CLI', 'Proposal and approval model', 'Helix canvas view'],
    link: 'https://github.com/ronin1102-tech/Mnemo',
    linkLabel: 'View on GitHub',
    body: [
      'Mnemo keeps notes as plain Markdown in a folder, then puts an MCP server in front of it so agents can read them and propose edits. The server is stdio only — no ports, no network — and when it runs read-only it registers no write tools at all.',
      'The design question was what an agent is allowed to do unattended. The answer is nothing. A write becomes a proposal on disk with a diff, a client name and a timestamp; there is no approve tool over MCP and no bypass flag. Every note a proposal depends on is hash-checked at approval, so if one of them changed, the proposal goes stale and nothing is applied. Paths are jailed to the vault, symlinks rejected, deletions move to trash, and writes are atomic: temporary file, fsync, rename, then fsync the directory.',
      'Reading is where the value sits. Full-text search over titles, tags and bodies with BM25 ranking, backlinks that show the linking line, N-hop neighbourhoods, and a structural similarity score that explains which links, linkers and tags it counted. The Helix view draws the vault on canvas and is built to hold sixty frames a second on a browser several years old.',
    ],
    size: 'large',
  },
]

export const bySlug = (slug: string) => projects.find((p) => p.slug === slug)

export const services = [
  {
    title: 'Audio DSP & plugins',
    body: 'Real-time audio in C++20 on JUCE: DSP architecture, effects and instruments, and the shared engine behind a whole suite. VST3, AU and standalone builds, with the core math written so it can be tested away from the framework.',
  },
  {
    title: 'Desktop apps',
    body: 'Local-first desktop software with Tauri, Rust and React. SQLite on disk, no telemetry, no network at runtime, and an interface that still behaves when the connection is gone.',
  },
  {
    title: 'Local-first developer tooling',
    body: 'MCP servers, CLIs and agent workflows where the human keeps the last word. Plain files you own, proposal-only writes, and nothing leaving the machine unless you ask it to.',
  },
]

// The one private piece that is represented without a name, a repo or a detail.
export const alsoBuilt = 'Private local AI agent system — built from scratch, used daily, no repo.'

export const testimonials: { quote: string; name: string; role: string }[] = []

export const experience = [
  { period: 'Present', title: 'Founder / Lead Architect & CEO', detail: 'Solstice Audio DSP — Cleveland, OH' },
  { period: 'Feb 2026 to Present', title: 'Process Assistant', detail: 'Amazon — Euclid, OH' },
  { period: 'Aug 2022 to Feb 2026', title: 'Process Guide', detail: 'Amazon — Euclid, OH' },
]

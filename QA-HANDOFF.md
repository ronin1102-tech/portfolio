# QA handoff — portfolio site

**Date:** 24 October 2026
**Branch:** `freebuff/53f0949b4fa6c1a8ff263a03`
**State:** dev preview on port 3000, plus a published Sites **preview** at
<https://site-173067090b0b44cda10d8563bebb8ddf.freebuff.page> (public link, shared
because the site had to be reviewed from a phone). Production is not published
and there is no custom domain. Identity and content answers applied 2026-10-23;
dark palette applied 2026-10-24. See section 6.

This pass replaced the template's six fictional case studies with the real GitHub
work. The page structure, motion and styling are the template's; the content and
covers are new. The site is a Vite + React 19 + Cloudflare Worker project.

---

## 1. Run it

```sh
bun install
bun run dev --host 0.0.0.0 --port 3000   # http://localhost:3000
bun run typecheck                        # tsc --noEmit
node posthog-analytics.verify.mjs        # the real analytics check, 20 tests
```

`vite.config.ts` sets port 5173; the preview here was started with
`bun run dev --host 0.0.0.0 --port 3000`, so **use 3000** against this workspace.
On the cloud preview hostname, `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` must carry
that hostname — it is passed as an env var, not written into config.

**Headless Chromium in this sandbox** (the amber sandbox image ships no browser and
no system libs for one, and `sudo` is blocked): Playwright's own browser works,
but only after three fixes — `apt-get download` + `dpkg -x` the NSS/ATK/X libs
into a prefix and point `LD_LIBRARY_PATH` at it, give it a fontconfig file
(`FONTCONFIG_FILE`) with a real font directory, and set
`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`. Without the fontconfig file,
Chromium fatals in Skia the moment the webfonts load. Screenshots of the dark
pass were taken this way.

> Do not use plain `bun test` as the pass/fail gate. It reports 1 failure in
> `tests/posthog-analytics.test.ts` by design: that suite expects its synthetic
> env vars to be injected by the runner. `node posthog-analytics.verify.mjs` is
> the intended entry point and passes 20/20.

---

## 2. What changed in this pass

| Area | Before | Now |
|---|---|---|
| Work grid | 6 fictional case studies | 4 real repos: Solstice Audio, SolsticeDocs, Local Writing Assistant, Mnemo |
| Covers | 6 stock photos | 4 drawn systems in the site palette, one per project |
| Case-study images | the cover cropped twice | two purpose-made 4:3 details per project (`*-detail-1.svg`, `*-detail-2.svg`) |
| Case studies | Client-work copy with invented metrics | Written from each repo's README, no invented numbers |
| Socials | 4 dead `#` links | GitHub added first, pointing at `ronin1102-tech` |
| Testimonials | 3 quotes from fictional clients | Removed; section hidden while empty |
| Work page link | "Visit the site" | `linkLabel` per project → "View on GitHub" |
| Work count label | hardcoded "6 projects, 2024 to now" | derived → "4 projects, 2026" |

Files touched: `src/data/site.ts`, `src/app/pages/Home.tsx`,
`src/app/pages/Work.tsx`, `src/app/pages/About.tsx`, `src/app/components/Footer.tsx`,
`src/app/components/icons.tsx` (new), `public/favicon.svg`, `index.html`,
`public/images/*.svg` (4 covers + 8 detail images).

### Identity and content pass (applied from the QA answers)

- Real identity: Tracy Weaver, software engineer (audio DSP & local-first tools),
  Cleveland, Ohio, `ronin1102@gmail.com`, open to full-time roles.
- Marquee and services rewritten around audio DSP, desktop apps and local-first
  tooling; the brand-identity / Fathom / Halcyon copy is gone.
- CV replaced with three real entries; the invented stats block was removed.
- Socials: GitHub and Instagram only. Are.na and LinkedIn removed.
- One anonymous line under the work grid for the private agent system.
- Footer availability now reads "Open to full-time engineering roles".
- Mnemo on GitHub: description set, default branch moved to `main`.

### Dark palette pass (24 October 2026)

Switched the site from warm paper to warm ink. Nothing about the layout, type or
content changed — only colour.

| Token | Was | Now |
|---|---|---|
| `bg` | `#f2efe9` | `#0e0d0b` |
| `surface` / `surface-2` | `#f8f6f1` / `#e9e5dd` | `#161513` / `#1e1c18` |
| `line` / `line-strong` | `#ddd8ce` / `#c9c3b7` | `#2c2924` / `#423d35` |
| `fg` | `#141311` | `#f4f1e9` |
| `muted` / `faint` | `#6a665e` / `#9c978d` | `#a9a399` / `#8a847a` |
| `accent` | `#2f3bff` | `#7c86ff` |

The accent is the same hue lifted: `#2f3bff` is a 3:1 hole against ink, so it
can't carry even large body text. `#7c86ff` holds 6.2:1.

Inverted surfaces (`bg-fg text-bg`) were re-decided one by one, because on ink
they turn cream:

- **Preloader** → `bg-surface-2`, cream name, accent counter. A cream curtain
  would have flashed white at every first load.
- **Contact CTA, "View project" pill, service chip** → stay cream with ink text.
  They are small, and cream-on-ink is the site's strongest contrast.
- **Testimonial panel** → dark `surface` with a hairline border instead of an
  inverted cream slab. Dead code today (the list is empty) but consistent for
  when quotes exist.
- **CTA hover** `#2b2925` → `accent`. The old hover darkened a light button; on
the new cream button it would have put dark text on dark brown.
- **Hero field** → rebuilt as a lighting rig, not a tint (see below).
- **Grain** → `screen` at 0.18. A `multiply` grain on ink multiplies dark by dark
  and disappears.
- `<meta name="color-scheme">` and `theme-color` now dark, so form controls,
  scrollbars and the mobile browser chrome match.

### Hero lighting

- Two elements, `hero-key` and `hero-warm` in `src/styles.css`, each one
  gradient stack with one blur. A source sits just past the right edge: a
  sliver, a bloom, a conic shaft with one hard-cut edge, and a violet bridge.
  `hero-warm` is the coral bounce off the floor at bottom left, kept separate
  because the key's falloff mask would swallow it.
- The mask on `hero-key` is the falloff. A conic gradient is infinite in
  radius; without it the shaft reaches the far corner at full strength and the
  whole thing reads as fog again.
- Geometry is in `vw`/`vh`, not percentages: both elements bleed 14% past the
  frame so the blur has room to die, and a percentage would then point
  somewhere other than where the light is aimed.
- Below 640px the shaft is steeper and comes from lower down — a shallow rake
  across a phone screen reads as a diagonal seam.
- The nav clock is `text-muted`, not `text-faint`: the key light reaches that
  corner, and faint over it measured 3.0:1.

Every cover and detail SVG was recoloured with a fixed hex map, not redrawn:
fields to dark tinted plates, paper panels to lifted dark panels, `#16150f` ink to
`#f4f1e9`, accents lifted to `#7c86ff` / `#ff8a63`, and the faint grid strokes
retuned from 0.06 to 0.075 so they don't turn into a wireframe. `site.ts` tints
were changed to match each cover's field.

### Portrait

`public/images/portrait.jpg` is the owner's own photo now, not stock. The source
was a Pixel 7 JPEG at 2736×3648 with GPS EXIF; the shipped file is 1200×1600 at
~100 kB with all metadata stripped. Both pages now show it in one `Portrait`
component (`src/app/components/Portrait.tsx`) at 320 px — 280 px under `sm` — so
the file carries nearly 4× the pixels it displays. It is deliberately not
re-encoded any smaller: a better photo is expected, and a second round trip
through JPEG would only cost quality on the file that ships next.

Three things were decided in the asset, not in CSS:

- The cream wall is the brightest thing on any page it appears. A radial falloff
  tinted toward ink (`#3a352c` at the edge) plus a 6% saturation trim and a
  slightly warm shadow sets it into the page instead of leaving it as a lit
  rectangle. The face is untouched.
- **`Parallax` gained a `zoom` prop.** The drift overscales the image by 12% and
  travels into that margin, so it crops 5.4% off the top at rest. This photo is
  framed with the cap crown 1.8% from the top edge, so the default flattened the
  crown — it read as a clipped image rather than a tight crop. The portrait is
  the only caller passing `strength={0} zoom={1}`: full frame, no drift. A
  roomier photo later can drop both props and get the drift back.
- Destination is unchanged: `aspect-[3/4]` on both pages, so a new portrait
  should be 3:4 or be cropped to it before it lands.

**Placement (later pass).** At column width (539×718 on About, 460 px tall on
the home teaser) the close-framed selfie read as a passport photo. It is now a
320 px plate (280 px under `sm`) on both pages, with a plate caption — name over
location, uppercase 12.5 px over a hairline. About stacks the socials beneath
it (`links`); home does not, since the footer already carries them. The markup
lives in `Portrait.tsx` so the two pages cannot drift apart again.

The caption is doing real work, not decoration: the About h1 is the role, so this credit is the only place the name
appears on that page. The caption is `text-fg` / `text-muted` on ink (17.2:1 and
7.8:1), so it clears 4.5:1 at that size without relying on weight. The copy
column keeps its old position and measure; only the image shrank, which leaves
the left column deliberately empty below the credit rather than padded to match
the height of the experience list.

### Icon pass

- The library arrows (`lucide-react`) are gone, replaced by a house set in
  `src/app/components/icons.tsx`: `ArrowOut`, `ArrowBack`, `Plus`. Drawn on a
  24 grid at a 2.2 stroke with a solid fletched head; they sit at 16px next to
  15px text, so check them at that size rather than zoomed in.
- Favicon redrawn as a four-bar waveform: `#0e0d0b` tile, `#f4f1e9` bars, one
  `#7c86ff` accent bar. It kept the pre-dark-pass colours (`#141311`,
  `#f2efe9`, `#2f3bff`) for a while, so in a tab it was the last surviving
  trace of the light theme. The accent bar is the lifted accent, not the brand
  indigo: on the ink tile `#2f3bff` is a dark hole — the same reason the
  palette lifted it for text. No PNG or `apple-touch-icon` fallback exists, so
  older iOS home-screen shortcuts get nothing.
- `index.html` title and description now carry the real name and role instead
  of the template's "Your Name".

### Contact delivery (24 October 2026)

- `/api/contact` now sends the message through Resend from the Worker. The
  sender goes in `reply_to`, so hitting reply in the inbox answers the person
  who wrote in, not the sandbox sender.
- Validation is unchanged on the surface — the same two error strings — with
  added length caps (80/200/4000) and a 400 for a body that will not parse.
- Spam: an off-screen honeypot named `website`, a 1.2 s floor between page load
  and submit, and a 5-per-minute rate limit keyed on the client address. The
  first two answer 200 and drop the message on purpose; telling a script it
  failed only invites a retry.
- No database. Nothing is stored, so there is no submission history to lose.
- Provider errors are logged, never returned: a 502 carries "try again, or email
  me" and keeps Resend's reason (which can name the account) out of the browser.
- The last send's outcome is kept in the isolate and reported by `/api/health`
  as `mail.connected` plus a fixed `reason` word (`key-rejected`,
  `recipient-not-allowed`, `sender-domain-unverified`, `request-rejected`,
  `rate-limited`, `provider-error`). Setting a key up is where this goes wrong,
  and the provider's own words cannot be shown to the public — this is the
  read-back that replaces hunting through Cloudflare's logs. It is per-isolate
  and disposable, not a submission history.
- `tests/contact-form.test.ts` records the outbound request instead of sending
  it: 18 tests over delivery, escaping, header injection, both validation paths,
  the traps, the missing-key path, the provider failure and the reason mapping.
  Real delivery was verified against the deployed Worker on 2026-10-24: three
  submissions accepted by Resend, all three received in the owner's inbox, with
  the honeypot still dropped and an invalid address still a 400.

---

## 3. Routes to cover

| Route | Expected |
|---|---|
| `/` | Hero, marquee, 4-card work grid, about teaser, services, footer. No quote block. |
| `/#work` | Smooth-scrolls to the grid. |
| `/work/solstice-audio` | Case study, **no** GitHub link, Astro and Orbit named only. |
| `/work/solsticedocs` | Case study + "View on GitHub". |
| `/work/local-writing-assistant` | Case study + "View on GitHub". |
| `/work/mnemo` | Case study + "View on GitHub". |
| `/about` | Profile page. |
| `/work/anything-else` | Redirects to `/`. |
| `/api/health` | `{"ok":true,"mail":{…}}` — `connected`, plus the last send's reason if it failed. |
| `POST /api/contact` | 400 on bad email or empty message, 503 with no key, 502 if Resend refuses, `{ok:true}` on valid. |

---

## 4. QA checklist

### Work grid
- [ ] Exactly 4 cards, in the order: Solstice Audio, SolsticeDocs, Local Writing Assistant, Mnemo.
- [ ] Every cover loads — no broken-image icons, no blank tint panels.
- [ ] **Covers are legible at both card sizes.** The large cards crop the 1:1 artwork at 16:10 and the small ones at 4:5, plus a 12% parallax scale. Nothing is lettered in the artwork now, so watch for a diagram losing its subject to the crop rather than for clipped text.
- [ ] Each case study shows two different 4:3 images, not the same crop twice.
- [ ] Hover shows the cursor-following "View project" pill.
- [ ] Each card opens its case study.
- [ ] "Next project" chains through all four and loops back to the first.

### Case-study pages
- [ ] Title, summary, meta list (Client / Year / Role / Delivered) and body all present.
- [ ] `solstice-audio` shows **no** GitHub link anywhere.
- [ ] `solstice-audio` names Astro and Orbit but gives no parameters, architecture or screenshots.
- [ ] The other three link to the right repo: `SolsticeDocs`, `grammar-tool`, `Mnemo` under `github.com/ronin1102-tech`.
- [ ] Link text reads "View on GitHub", not "Visit the site".

### Dark palette
- [ ] Nothing on the page is still paper-coloured: no cream panel, no dark-on-dark text, no black-on-black input.
- [ ] Hero lighting reads as a source, not as grey haze, at both 390 and 1440.
- [ ] Nothing crossed by the shaft drops below 4.5:1 — the h1, the intro and the nav clock are the three that sit in it.
- [ ] Covers stay distinct from the page background and from each other.
- [ ] Browser chrome (address bar on mobile) is dark, not white.
- [ ] Body text, muted copy, faint captions and the accent all clear 4.5:1; accent-on-ink is the one to re-check if the accent moves.

### Responsive
- [ ] 1440, 1024, 768, 390 widths: no horizontal scroll, nav intact, grid collapses to one column.
- [ ] Mobile: hover-only affordances are not required to reach a case study.

### Motion and accessibility
- [ ] Preloader counts once per tab and then releases the page.
- [ ] With `prefers-reduced-motion: reduce`, reveals and the marquee do not animate.
- [ ] Keyboard: tab reaches nav, cards, service accordions, footer consent and the form; focus is visible.
- [ ] Heading order is sane (one `h1` per page).
- [ ] Cover images carry the project title as alt text on the home grid.

### Contact form
- [ ] Invalid email → inline error, no crash.
- [ ] Empty message → inline error.
- [ ] Valid input with `RESEND_API_KEY` set → success state, and the message
      arrives in the inbox named by `CONTACT_TO` (default: the address in
      `src/data/site.ts`) with the sender in `reply_to`.
- [ ] Valid input **without** the key → the form says it is not connected yet and
      gives the email address instead. It must not claim success.
- [ ] Submitting within a second of page load is dropped silently (bot floor);
      a honeypot field named `website` exists off-screen and is skipped by Tab.
- [ ] A seventh submission in a minute from one address → 429 with a retry
      message (Cloudflare only; the limiter is guarded because not every host
      provides the binding).

### Analytics (pre-existing integration, not changed here)
- [ ] No `VITE_POSTHOG_*` env → no requests, no errors.
- [ ] Consent starts undecided: nothing sent before a decision.
- [ ] Deny → no events on card clicks or email clicks. Grant → `project_opened`, `email_clicked`, `contact_submitted` only.
- [ ] No URL, referrer, UTM or person data on any event payload.

### Content accuracy
- [ ] Nothing on the page claims a metric or client that does not exist.
- [ ] No placeholder identity, template CV entry or brand-design copy remains.

---

## 5. Known gaps — do not file these

1. **Desktop Chromium sign-off, but not a real device.** The sandbox now has
   headless Chromium (see section 1), so the dark pass was reviewed as screenshots
   at 1440/1280 wide and at 390 with mobile emulation, and every text colour was
   checked for contrast in the live DOM. Still unverified: iOS Safari (the
   `100svh` hero and the `corner-shape: squircle` corners), and how the palette
   looks on a real phone screen outdoors.
2. **Solstice Audio has no repo link on purpose.** The repo is private on
   GitHub; linking it would 404 for visitors.
3. **Testimonial block is absent by design.** The three template quotes were
   attributed to the fictional clients whose projects were deleted, so they were
   removed rather than left praising nothing.
4. **The portrait is Tracy's own, and it is a placeholder by the owner's words.**
   A selfie taken at arm's length, framed tight; a shot from further back would
   suit the plate better and is expected. Both pages now render it at 320 px
   (280 on a phone) from `Portrait.tsx`.
5. **Deployment is split.** The site is live on Freebuff Sites and the source is
   on GitHub (`ronin1102-tech/portfolio`, private). A Cloudflare Workers build is
   configured but not connected; analytics ships dark (no token). The contact
   form delivers only once `RESEND_API_KEY` exists on whichever host runs the
   Worker — until then it answers 503 and points at the email address rather
   than pretending to have sent something.
6. **`solstice-website` is not shown.** Its README is one line and it has no
   description.
7. **Private repos are excluded entirely**: `solstice-agent`, `silky-`,
   `Solstice-Markets`, `solstice-astro-landing`.

---

## 6. Decisions on record

Answered by Tracy on 23 October 2026 and applied to the build.

**Identity** — Tracy Weaver · Software engineer — audio DSP & local-first tools ·
Cleveland, Ohio (America/New_York) · ronin1102@gmail.com · open to full-time
engineering roles.

**Projects**

6. Solstice Audio stays private. The card has no repo link; point it at the
   planned public showcase if and when that exists.
7. Astro and Orbit stay named, with no parameters, architecture or screenshots.
8. Mnemo fixed on GitHub: description set, default branch now `main` (created at
   the old branch tip; `claude/new-session-bzyycu` still exists).
9. `solstice-website` stays omitted until it has a real README and description.
10. One anonymous line under the work grid: "Private local AI agent system —
    built from scratch, used daily, no repo." Nothing more about it.

**Content**

11. Testimonials stay hidden. No real quotes on file; none will be invented.
12. Services rewritten: audio DSP & plugins (C++/JUCE), desktop apps, local-first
    developer tooling.
13. Marquee: Audio DSP · Real-Time C++ · Local-First Tools · Desktop Apps ·
    Developer Tooling · JUCE.
14. CV replaced with the three real entries; every template entry removed.
15. Socials: GitHub and Instagram only. Are.na and LinkedIn removed.

**Operational**

16. ~~Contact form stays acknowledgement-only for this pass.~~ Superseded on
    24 October 2026: it forwards to ronin1102@gmail.com through Resend, with the
    sender as `reply_to`. Still no database — nothing is stored, so there is no
    submission history to leak or maintain.
17. Analytics stays dark: no token supplied, integration left in the bundle.
18. Preview only. No Sites publish and no custom domain until a separate go.

## 7. Sign-off

QA passes this handoff when section 4 is fully ticked apart from the items in
section 5. The one item we would like eyes on before
anything else: **the four covers in the live grid**, since the artwork was only
ever inspected as flat crops, never in place with parallax and hover.

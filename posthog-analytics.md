# PostHog product analytics

## Repository facts (recorded before edits)

- **Package manager:** Bun. No `packageManager` field in `package.json`; the
  committed lock is the text `bun.lock` (Bun 1.2+ format). No `yarn.lock`,
  `pnpm-lock.yaml`, `package-lock.json` or `bun.lockb` exists, so there is no
  mixed-manager signal.
- **Owning package:** the root package `portfolio` (single-package repo: Vite +
  React SPA in `src/app`, a Hono Worker in `src/worker`, deployed through
  `deploy.json`). `posthog-js` belongs in the root manifest.
- **Toolchain seen in the working copy:** Bun 1.3.14, Node v22.23.3, Vite 8.3.5,
  TypeScript 5.9.3, React 19.3.1, React Router 8.5.0, Hono 4.13.13.
- **Quality commands that actually exist:**
  - `bun run typecheck` → `tsc --noEmit`
  - `bun run build` → `vite build && node scripts/postbuild.mjs`
  - There is **no** lint script and no test script in `package.json`.
- **Baseline (before any change):** `bun run typecheck` passed, `bun run build`
  passed. No lint or test command to run. Only `bun.lock` was modified in the
  working copy at the start (the environment's `bun install` rewrote it from
  lockfileVersion 2 to 1 and refreshed transitive versions); that pre-existing
  change was left in place.
- **Existing analytics/consent/identity code:** none. No PostHog, no cookie
  banner, no CMP, no login. The contact form (`src/worker/index.ts` →
  `POST /api/contact`, `src/app/components/Footer.tsx`) is the only conversion.

## Question

Do visitors who open a case study go on to start a conversation?

## Events

| Event | Meaning | When |
| --- | --- | --- |
| `project_opened` | A visitor opened a case-study page from the work grid or from a case study's next-project link | Click on the project link (`WorkCard`) or the next-project link (`Work` page) |
| `email_clicked` | A visitor chose the direct email route instead of the form | Click on the nav mailto link or the footer mailto button |
| `contact_submitted` | The contact form accepted a submission | After `POST /api/contact` returned 2xx in `Footer` |

Three events, all client-side. No pageviews, no autocapture, no replays, no
surveys, no feature flags, no server capture. The contact Worker is unchanged.

## Triggers (real files/functions)

- `src/app/components/WorkCard.tsx` — `<Link to={`/work/${project.slug}`}>` click →
  `analytics.projectOpened({ slug, index, placement: 'home_grid' })`
- `src/app/pages/Work.tsx` — next-project `<Link>` click →
  `analytics.projectOpened({ slug: next.slug, index: nextIndex, placement: 'next_project' })`
- `src/app/components/Nav.tsx` — `Contact` mailto click → `analytics.emailClicked('nav')`
- `src/app/components/Footer.tsx` — mailto button click → `analytics.emailClicked('footer')`
- `src/app/components/Footer.tsx` — `submit()` success → `analytics.contactSubmitted()`
- `src/app/lib/analytics.ts` — the single client, consent gate and scrubber

## Allowed properties

Only these leave the browser. Anything else is dropped before `capture()` runs
and again in `before_send`.

- `project_opened`: `project_slug` (string ≤ 64), `project_index` (finite number),
  `placement` (`home_grid` | `next_project`)
- `email_clicked`: `placement` (`nav` | `footer`)
- `contact_submitted`: `form` (`footer_contact`)

Never sent: name, email, message, phone, password, tokens, card data, form
contents, page URL, referrer, UTM parameters, person properties (`$set`,
`$set_once`), browser/OS/device metadata. `before_send` rebuilds each event with
only the allowlisted properties plus the SDK's anonymous `distinct_id`.

## Identity

Anonymous. There is no login on this site, so `identify()` is never called and
the SDK's own opaque device `distinct_id` is reused. `resetIdentity()` exists on
the analytics client and is documented as the logout hook for when auth is
added (it resets the SDK and re-applies the stored consent decision, because
`reset()` clears consent state). No email or name is ever used as an identifier.

## Consent

- The client initialises with `opt_out_capturing_by_default: true`. No stored
  decision means off; nothing is captured, no cookie/localStorage state is
  written by the SDK.
- The decision lives in `localStorage` under `portfolio.analytics-consent`
  (`granted` / `denied`). `setConsent()` calls `opt_in_capturing()` /
  `opt_out_capturing()` and persists it; a denial revokes capture immediately.
- The footer has the consent control ("Analytics off/on"); there was no CMP to
  preserve, so this is the decision surface. No cookieless fallback.
- Missing token or host, a malformed host, denied consent and transport errors
  are all harmless no-ops; instrumentation never changes page behaviour.

## Live analysis (the insight to build)

- **Event order:** `project_opened` (funnel start) → `contact_submitted`
  (funnel success). `email_clicked` is a secondary contact-intent signal and is
  not a funnel step.
- **Denominator:** unique anonymous visitors who fired `project_opened`.
- **Timeframe:** last 30 days, compared with the previous 30 days once there is
  history.
- **Success measure:** share of those visitors who reached
  `contact_submitted`, plus the share who instead fired `email_clicked`. The
  useful answer is which case study (group by `project_slug`) produces contact
  intent, so the finding is "case study X sends N% of its readers to contact".
- **How to build it:** PostHog → Product analytics → Funnel, step 1
  `project_opened`, step 2 `contact_submitted`, 30-day window, breakdown by
  `project_slug`; add a Trends insight for `email_clicked` broken down by
  `placement` as the secondary contact-intent signal.

## Integration evidence

- **Importer:** root package `portfolio` (`package.json`).
- **Manifest:** `"posthog-js": "1.438.13"` in `dependencies` (exact pin).
- **Resolved version:** 1.438.13 in `node_modules/posthog-js/package.json`.
- **Lock evidence:** `bun.lock` entry
  `"posthog-js": ["posthog-js@1.438.13", ...]`, written by
  `bun add posthog-js@1.438.13` (Bun 1.3.14, the repo's manager; lock not
  migrated or replaced). Bun blocked the package's one postinstall script.
- **SDK entry point:** dynamic `import('posthog-js')` from
  `src/app/lib/analytics.ts`; one singleton client for the app, initialised from
  `src/main.tsx`.

## Configuration

Set in `.env.local` (git-ignored, never committed):

```sh
VITE_POSTHOG_PROJECT_TOKEN=   # public project token from the PostHog project
VITE_POSTHOG_HOST=            # https://us.i.posthog.com or https://eu.i.posthog.com
```

`.env.example` holds the same names with empty values. Capture stays off until
both are set to a valid value (host must be an `https://` URL). The host is
never inspected live by this code or its tests.

## Offline verification

```sh
bun posthog-analytics.verify.mjs
```

Runs `bun --no-env-file test tests/posthog-analytics.test.ts` in a child process
with an empty environment plus `PATH`/`HOME`/`TMPDIR` and a fixed synthetic
token/host; no network, no SDK delivery. The tests import the real
`src/app/lib/analytics.ts`, drive the real handlers with an in-memory SDK client,
and read `package.json`/`bun.lock` read-only to check the pin. They fail if no
test runs or nothing is asserted.

## Checks after the change

- **Typecheck:** `bun run typecheck` → passed.
- **Build:** `bun run build` → passed. `posthog-js` is emitted as its own lazy
  chunk and is only fetched when a token and host are configured. No PostHog
  token literal appears in `dist`.
- **Offline handler tests:** `bun posthog-analytics.verify.mjs` → 20 tests,
  0 failures, 107 `expect()` calls. Covers missing token/host, malformed host,
  denied and absent consent, revocation, allowlisted properties, PII sentinels,
  URL/referrer/person scrubbing, transport failure, anonymous identity and the
  manifest/lock pin.
- **Lint:** this repository has no lint script, so none was run.
- **Dev smoke:** `bun run dev --port 5199` served `/` and the analytics module
  with no configured token; analytics stayed a no-op. The process was stopped
  afterwards.
- **Scope:** only app/test source, `.env.example`, `.gitignore`, the manifest
  and `bun.lock`, the verification runner and this note changed.

## Live insight

**Pending.** No real project token was configured in this run and the setup
tests deliberately send nothing, so no events were transmitted and no PostHog
insight exists yet. Nothing was deployed, and no remote state was changed.

## Step 5: verify with a real project

1. Create a project at the PostHog signup link from the task.
2. Put its public project token and the matching ingestion host into
   `.env.local` under the two names above (never in chat or source).
3. Run `bun run dev`, open the site, click "Analytics on" in the footer, open a
   case study, then submit the contact form (the Worker responds 200 locally).
4. In PostHog, find `project_opened`, `email_clicked`, `contact_submitted` in
   the activity feed, then build the funnel above grouped by `project_slug`.
5. Record the finding here.

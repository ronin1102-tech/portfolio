# Handoff — where this stands

For a fresh session on this repo. Written 24 October 2026. `QA-HANDOFF.md` is the
longer design-and-QA record; this file is the operational one: what is deployed,
what has actually been proven, and how to get it running again from nothing.

---

## 1. Current state at a glance

| Thing | Value |
|---|---|
| Live site | `https://portfolio.ronin1102.workers.dev` |
| Where it runs | Cloudflare Workers, **the owner's account**, Worker name `portfolio` |
| Source | `github.com/ronin1102-tech/portfolio`, public, branch `main` |
| Deployed commit | `742c2c7` — bundle hash `index-Dgmb54XZ.js` |
| `main` HEAD | `2a45704` (one commit ahead: reason code in the 502 body) |
| Git-connected build | **No.** Pushes do not deploy. There is no Deploy button that rebuilds. |
| Sending | Resend, key stored as a Worker **secret** named `RESEND_API_KEY` |
| Analytics | Dark — no `VITE_POSTHOG_*` supplied, PostHog stays inert |
| Database | None. Nothing is stored; there is no submission history to lose. |

The gap that matters: **HEAD is one commit ahead of what is live.** The difference
is small — a failure reason code added to the 502 body — but it means "pushed"
and "deployed" are separate facts here, always.

---

## 2. Verified, with evidence

Checked against the live Worker and the real runtimes, not inferred from the code.

- **Email delivery works end to end.** Three submissions accepted by Resend and
  observed in the owner's inbox on `c306cce`, plus a fourth accepted (`200`) on
  the current build. Sender is `Portfolio <onboarding@resend.dev>`; `reply_to` is
  whoever filled the form, so replying answers the visitor.
- **The Worker really runs on Cloudflare.** Proven on throwaway deploys of this
  app: the site's assets uploaded, `env.ASSETS` and `env.CONTACT_RATE_LIMIT
  (5 requests/60s)` bound, startup 1–3 ms, then deleted again.
- **Rate limiting fires.** A burst of twelve submissions returned two `429`s and
  then recovered after a pause. Cloudflare documents the counters as approximate
  and per-location, so a burst can overshoot before it clamps — a script stopper,
  not a flood defence.
- **The request matrix behaves.** Invalid email `400` · empty message `400` ·
  malformed JSON `400` · honeypot filled `200` and dropped · submitted in 200 ms
  `200` and dropped · no key `503` naming the address · provider rejection `502`
  with no provider text.
- **Routes and assets.** `/`, `/about`, `/work/mnemo` (SPA fallback, not 404),
  `/api/health`, the JS bundle, `portrait.jpg`, `favicon.svg` all serve with the
  right content types.
- **Link previews and copy.** All 14 preview tags are in the served HTML (10
  `og:`, 4 `twitter:`), and the current SolsticeDocs paragraph is in the served
  bundle.
- **Gates.** `tsc --noEmit` clean · `tests/contact-form.test.ts` 18/18 ·
  `node posthog-analytics.verify.mjs` 20/20 · `bun run build` clean.

## 3. Not verified — do not claim these

- **The form driven by a real browser.** Chromium in the build container crashes
  the renderer on this site as soon as JavaScript runs; reproduced against an
  earlier commit served as plain static files, so it is the container, not the
  site. The bundle was checked for the honeypot field and `elapsedMs` instead.
- **iOS Safari and real devices.** `100svh` and `corner-shape: squircle` are
  unproven there, as is the palette outdoors.
- **PostHog.** No token, so nothing is captured and consent flows are untested
  against a real project.
- **The Workers Builds path.** Never run. Git has no check run on any commit.
- **Spam resistance beyond the three heuristics.** Nothing tests a determined,
  distributed attacker.

---

## 4. Redeploy from scratch

Needs `git`, [Bun](https://bun.sh) and a browser for the one-time login. Nothing
else — no API token, no `.env`.

```sh
git clone https://github.com/ronin1102-tech/portfolio.git
cd portfolio
bun install
bun run build            # emits dist/client (site) and dist/portfolio/index.js (Worker)
bunx wrangler login      # one-time browser approval
bunx wrangler whoami     # confirm the right account
bunx wrangler deploy
```

Optional but cheap: `bun run build && bunx wrangler deploy --dry-run` prints the
asset count and bindings without uploading.

**The name matters.** `wrangler.jsonc` sets `name: "portfolio"`. Deploying with a
different name creates a *second* Worker with no `RESEND_API_KEY`, whose form then
answers 503. The live hostname confirms the name is right.

**What survives a deploy:** Worker secrets. Wrangler never deletes them, so
`RESEND_API_KEY` stays put. If it is ever missing, re-add it:

```sh
bunx wrangler secret put RESEND_API_KEY   # prompts; value never enters shell history
bunx wrangler secret list                 # shows the name, never the value
```

**Confirm the deploy took:**

```sh
curl -s https://portfolio.ronin1102.workers.dev/api/health
# expect {"ok":true,"mail":{"connected":true,"last":...}}
```

`mail.connected: true` means the secret is visible to the runtime. Then send one
real submission through the form and check the inbox.

**Rollback**, if a deploy misbehaves:

```sh
bunx wrangler deployments list
bunx wrangler rollback
```

### Making pushes deploy themselves

Cloudflare → Workers & Pages → `portfolio` → Settings → Build → Connect:

1. Repository `ronin1102-tech/portfolio`, branch `main`.
2. Worker name `portfolio` — must match `wrangler.jsonc`.
3. Build command `bun run build`; deploy command `bunx wrangler deploy`; root `/`.
4. Save. Every push to `main` then builds and deploys.

Bun is in Cloudflare's build image (default 1.2.15; `packageManager` in
`package.json` pins `bun@1.3.14`), so no extra setup. `VITE_POSTHOG_*` belong in
**Settings → Build → Build variables** if analytics is ever switched on — they are
inlined at build time and are not runtime secrets.

---

## 5. When mail stops arriving

The form never pretends success. Read the status:

| Response | Meaning | Fix |
|---|---|---|
| `503` | No `RESEND_API_KEY` in the runtime environment | Add it as a **Secret** under Settings → Variables & Secrets, then **Deploy**. Check it is not in *Build* variables, which the runtime cannot see. |
| `502` + `reason: "key-rejected"` | Resend rejected the key | Re-issue in Resend → API Keys and re-save the secret. Check for truncation on paste. |
| `502` + `reason: "recipient-not-allowed"` | Resend test mode: the account's signup address is not the recipient | Set a plain **Text** variable `CONTACT_TO` to the address the Resend account was created with. |
| `502` + `reason: "sender-domain-unverified"` | `CONTACT_FROM` names a domain not verified in Resend | Remove `CONTACT_FROM` (sandbox sender works) or verify the domain. |
| `502` + `reason: "rate-limited"` | Resend's own quota | Wait. Free tier is 3,000/month, 100/day. |
| `502` + `reason: "request-rejected"` | Resend accepted the key but not the request | Code problem — read the Worker log, it holds the full provider message. |
| `200` but nothing arrives | Resend accepted and queued it | Check Spam/Promotions, and that `CONTACT_TO` is a mailbox someone reads. The Worker cannot see past the handoff. |

`reason` in the response is part of `2a45704`, so it appears only once that is
deployed; before that, the code is in `/api/health` but is unreliable (below).

---

## 6. Quirks worth knowing before debugging

- **A 200 on this site does not prove a file exists.** Missing paths fall through
  to the SPA shell: `/images/aurora.jpg` (deleted) returns `200`, `text/html`,
  ~2 KB. Check `content-type`, not the status.
- **`mail.last` in `/api/health` is per-isolate.** Cloudflare runs many isolates
  and module memory does not cross them, so a submission followed by a health
  check often sees `null`. Proven by repro: separate processes gave `null`, a
  reused connection gave the reason. That is why the reason also rides on the 502.
- **Plain `bun test` shows one failure by design.** The PostHog suite needs its
  runner: `node posthog-analytics.verify.mjs`. Use that as the gate, not
  `bun test`.
- **Deleting an unused asset only removes it from the build**, not from anyone's
  cache — harmless here, since nothing references them.
- **The Resend sandbox sender only reaches the account's own signup address.**
  Real visitors are unaffected (the form sends *to* the owner), but this is why a
  custom domain matters the day the site emails anyone else.

---

## 7. Open items

1. **Deploy `2a45704`** so the failure reason rides on the 502. Small, optional,
   and the last piece of the QA pass that is not live.
2. **Connect Workers Builds** (§4) so a push deploys. Until then every change
   needs a manual `wrangler deploy`, and "pushed" ≠ "live".
3. **Verify a domain in Resend**, then set `CONTACT_FROM` — mail currently arrives
   from `onboarding@resend.dev`.
4. **A real browser and a real phone** on the live site, which nothing here can do.
5. **No custom domain.** `portfolio.ronin1102.workers.dev` is the address in the
   OG tags; both change together if a domain is added.

Separate from this file: `QA-HANDOFF.md` holds the design decisions, the identity
and content rules, and the "do not regress" list — read it before changing copy.

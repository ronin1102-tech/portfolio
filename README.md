# Portfolio

A personal site for a designer or developer: a counted preloader, an
oversized name, a services marquee, a selected-work grid with parallax and a
cursor-following label, an about teaser, an expanding services list, rotating
testimonials and a contact section with a working form. Each project has a
case-study page with a next-project link, and there is a full about page.

## Run it

```sh
bun install
bun run dev        # http://localhost:5173
bun run build      # dist/client (assets) + dist/portfolio/index.js (Worker)
```

## Make it yours

- `src/data/site.ts` is the whole site: your name, role, location, socials,
  projects, services, testimonials and experience. Images live in
  `public/images`; each project has one cover and the case-study page crops it
  for detail shots until you add more.
- `src/app/pages/*` are the three pages; `src/app/components/motion.tsx` holds
  the reusable animation pieces (masked line reveals, parallax, magnetic
  buttons, the rotating badge).
- `src/styles.css` holds the tokens: a paper canvas, ink text, one electric
  accent, Bricolage Grotesque for display type. Everything rounded is a
  squircle via `corner-shape`; true circles use `.round`.
- `src/worker/index.ts` receives the contact form at `/api/contact` and emails
  it to you through Resend. See [Contact form](#contact-form) to switch it on.

Motion respects `prefers-reduced-motion`, and the preloader runs once per tab.

## Contact form

The Worker validates the form, drops obvious bots, then sends the message to
your inbox with a `reply_to` of whoever wrote it. It needs one secret:

| Variable | Kind | What it is |
| --- | --- | --- |
| `RESEND_API_KEY` | secret | API key from resend.com. Never a build variable — the browser never sees it. |
| `CONTACT_FROM` | optional var | Sender, e.g. `Site <form@yourdomain.dev>`. Defaults to Resend's sandbox sender. |
| `CONTACT_TO` | optional var | Where enquiries land. Defaults to the address in `src/data/site.ts`. |

Until the domain is verified in Resend, the sandbox sender `onboarding@resend.dev`
can only deliver to the address the Resend account was created with — which is
fine when that address is the one in `src/data/site.ts`. Verify a domain and set
`CONTACT_FROM` to send from your own.

Set the secret on whichever host runs the Worker: **Cloudflare** → the Worker →
Settings → Variables & Secrets → add `RESEND_API_KEY` as a *secret*; **Freebuff
Sites** → Sites → Secrets. Without it the route answers 503 and the form tells
the visitor to email directly, so a half-configured deploy loses no messages
silently.

What keeps bots out: a honeypot field no person can see, a floor on how fast the
form can be filled, and a per-address rate limit of 5 a minute (`ratelimits` in
`wrangler.jsonc`, guarded so hosts without the binding still work).

```sh
bun test tests/contact-form.test.ts
```

## Deploy

Current deployment state, what is verified, and the from-scratch redeploy steps
are in [HANDOFF.md](HANDOFF.md).

`bun run build` emits two things: `dist/client` (the site) and
`dist/portfolio/index.js` (the Hono Worker that answers `/api/*` and serves the
site). Both hosting paths below use the same build.

### Freebuff Sites

`deploy.json` points at the build output. After `bun run build`, deploy with
the `sites_deploy` tool from this directory.

### Cloudflare Workers, deploying on push

Workers Builds connects this repo to a Worker: every push to `main` builds and
deploys. Nothing needs to run locally and no API token is stored here.

1. Workers & Pages → Create application → Connect to Git → pick this repo,
   branch `main`.
2. Name the Worker `portfolio`. It must match `name` in `wrangler.jsonc`, or
   the build fails before it deploys anything.
3. Build command `bun run build`; deploy command `bunx wrangler deploy`
   (`npx wrangler deploy`, the default, works too — Wrangler comes from
   `devDependencies`).
4. Root directory `/`.
5. `VITE_POSTHOG_*` are inlined by Vite at build time, so they belong in
   Settings → Build → Build variables, not in runtime secrets, which the
   browser bundle never sees.

Wrangler resolves the build's own output through `.wrangler/deploy/config.json`,
so check a local build the same way CI will before pushing:

```sh
bun run build && bunx wrangler deploy --dry-run
```

That prints the asset count and the `ASSETS` binding without uploading.

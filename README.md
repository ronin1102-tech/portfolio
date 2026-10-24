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
- `src/worker/index.ts` receives the contact form at `/api/contact`. Forward
  it to your inbox with an email API (key in Sites → Secrets) or save it to D1.

Motion respects `prefers-reduced-motion`, and the preloader runs once per tab.

## Deploy

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

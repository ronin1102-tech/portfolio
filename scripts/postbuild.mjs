// Tidies the build output for hosting: the Sites uploader refuses hidden files
// and source maps, so the browser bundle is stripped of both.
//
// The Worker's own map stays. `vite build` leaves a `//# sourceMappingURL` in
// dist/portfolio/index.js, and `wrangler deploy` resolves that reference before
// uploading — delete the map and the deploy fails with "Invalid source map
// path", which is exactly how a Cloudflare build would break on its first run.
import { readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

function clean(dir, { maps }) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (name.startsWith('.') || (maps && name.endsWith('.map'))) {
      rmSync(path, { recursive: true, force: true })
      continue
    }
    if (statSync(path).isDirectory()) clean(path, { maps })
  }
}

const dist = new URL('../dist', import.meta.url).pathname
clean(join(dist, 'client'), { maps: true })
clean(join(dist, 'portfolio'), { maps: false })

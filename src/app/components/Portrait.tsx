import { site } from '../../data/site'
import { ArrowOut } from './icons'
import { Parallax } from './motion'

/**
 * The portrait as a credited plate — one treatment, both pages.
 *
 * Sized at 320 px (280 under `sm`) on purpose: the photo is framed close, and
 * at column width it read as a passport photo. What makes it a plate rather
 * than decoration is the caption under it, so the caption is not optional
 * here. On About the h1 is the role, which makes this credit the only place
 * the name appears on that page; on the home teaser it re-grounds the face
 * long after the hero name has scrolled away.
 *
 * The links are the About page's, where socials belong to the same margin;
 * the home page and footer already carry them.
 */
export function Portrait({ links = false, className }: { links?: boolean; className?: string }) {
  return (
    <div className={className}>
      <figure className="max-w-[280px] sm:max-w-[320px]">
        {/* Still frame: the drift over-scales and clips 5.4% off the top, which
            this photo cannot spare — the cap crown sits 1.8% from the edge. */}
        <Parallax src="/images/portrait.jpg" alt={site.name} className="aspect-[3/4] rounded-image" strength={0} zoom={1} />
        <figcaption className="mt-4 border-t border-line pt-3 text-[12.5px] uppercase tracking-[0.09em]">
          <span className="block text-fg">{site.name}</span>
          <span className="mt-1 block text-muted">{site.location}</span>
        </figcaption>
      </figure>
      {links && (
        <ul className="mt-7 flex flex-col gap-1.5 text-[14px]">
          {site.socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} className="link-draw inline-flex items-center gap-1 text-muted hover:text-fg">
                {s.label}
                <ArrowOut className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

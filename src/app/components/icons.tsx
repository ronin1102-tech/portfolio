import type { SVGProps } from 'react'

/**
 * The site's own icons, drawn on a 24 grid. Every arrow carries a solid
 * fletched head instead of the thin chevron every icon library ships — that
 * chevron is what made the old ones read as generic. Kept deliberately large
 * within the grid with a 2.2 stroke, because these sit at 16px next to 15px
 * text and anything finer greys out. The plus stays a conventional cross: it
 * is an expand affordance first, decoration second.
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string }

function Svg({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** Out: leaves the line, lands top-right. */
export function ArrowOut(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.8 18.2 14.7 9.3" />
      <path d="M19.6 4.4 16.6 11.6 11.7 6.6Z" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/**
 * Back: the same head, landing left. The axis sits three quarters of a unit
 * below centre so the horizontal rule lands on a pixel centre at 16px; on the
 * grid it splits across two rows and reads as pale grey.
 */
export function ArrowBack(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.6 12.75H11" />
      <path d="M4.4 12.75 11.2 9.35 11.2 16.15Z" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** Expand: rotates to a close on open rows. */
export function Plus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.4v15.2M4.4 12h15.2" />
    </Svg>
  )
}

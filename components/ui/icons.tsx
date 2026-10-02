import type { ReactNode, SVGProps } from "react";

/**
 * The site's few icons, drawn here rather than pulled from a package.
 *
 * Six glyphs do not justify a dependency, and drawing them keeps them in the
 * site's own hand: a 24 unit grid, a 1.5 stroke with round ends and joins, no
 * fills. They are sized in `em` and painted in `currentColor`, so an icon
 * takes the size and the colour of the text it sits beside, hover accent
 * included, with nothing to keep in step.
 *
 * Every one is decorative. It sits next to a word that already says what the
 * link is, so it is hidden from assistive tech rather than given a second,
 * competing name.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function Glyph({ children, className, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={`shrink-0 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** The camera outline: a rounded square, the lens, the flash. */
export function InstagramIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.25" cy="6.75" r="0.6" />
    </Glyph>
  );
}

/** "in" in a rounded square: the stem with its dot, then the arch of the n. */
export function LinkedInIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5V17" />
      <circle cx="8" cy="7.25" r="0.6" />
      <path d="M12 17v-6.5M12 13.5c0-1.75 1.15-3 2.6-3S17 11.6 17 13.25V17" />
    </Glyph>
  );
}

/** An envelope with its flap folded down to the middle. */
export function MailIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </Glyph>
  );
}

/** A handset, earpiece top left and mouthpiece bottom right. */
export function PhoneIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6 4h3.2l1.6 4-2.1 1.3a11 11 0 0 0 5 5l1.3-2.1 4 1.6V17a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2Z" />
    </Glyph>
  );
}

/** A map pin, which is also the "o" of the wordmark. */
export function MapPinIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Glyph>
  );
}

/** Off the page: the link opens somewhere else, in a new tab. */
export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M7.5 16.5 16.5 7.5M9 7.5h7.5V15" />
    </Glyph>
  );
}

export const ICONS = {
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  mail: MailIcon,
  phone: PhoneIcon,
  "map-pin": MapPinIcon,
} as const;

export type IconName = keyof typeof ICONS;

/** One of the named icons, for lists that carry the name as data. */
export function Icon({ name, ...props }: IconProps & { name: IconName }) {
  const Named = ICONS[name];
  return <Named {...props} />;
}

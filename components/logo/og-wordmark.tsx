import {
  LOGO_DASHES,
  LOGO_LETTERS,
  LOGO_PIN_BODY,
  LOGO_PIN_INK,
  LOGO_ROAD,
  LOGO_VIEWBOX,
} from "./logo-paths";

/** The site's three colours, as literals: an image has no stylesheet. */
export const OG_COLORS = { paper: "#f2efe9", ink: "#141414", accent: "#ffc72c" } as const;

/**
 * The wordmark for the share images.
 *
 * The same outlines as `SocialYatriLogo`, set as plain SVG because the share
 * images are drawn by Satori, which reads inline SVG but none of the page's
 * CSS variables or data hooks. It is the static mark: the lane markings are
 * cut out of the road with the even-odd rule, so the paper shows through them
 * rather than a painted copy of it.
 */
export default function OgWordmark({ width, ink = OG_COLORS.ink }: { width: number; ink?: string }) {
  // The viewBox is 1000 by 369; the height follows the width.
  const height = Math.round((width * 369) / 1000);
  return (
    <svg viewBox={LOGO_VIEWBOX} width={width} height={height}>
      <path d={[...LOGO_ROAD, ...LOGO_DASHES].join(" ")} fill={ink} fillRule="evenodd" />
      {LOGO_PIN_BODY.map((d, i) => (
        <path key={`body-${i}`} d={d} fill={OG_COLORS.accent} fillRule="evenodd" />
      ))}
      {LOGO_PIN_INK.map((d, i) => (
        <path key={`ink-${i}`} d={d} fill={ink} fillRule="evenodd" />
      ))}
      {LOGO_LETTERS.flatMap((letter) =>
        letter.d.map((d, i) => <path key={`${letter.id}-${i}`} d={d} fill={ink} fillRule="evenodd" />),
      )}
    </svg>
  );
}

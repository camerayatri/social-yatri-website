import Carousel from "./carousel";
import type { orderedShoots } from "@/lib/cms/derive";

/**
 * Every frame the client shot, grouped by the shoot it came from.
 *
 * One strip per shoot, ruled off from the next and counted in the corner: the
 * page's own label grid, not a lightbox gallery.
 *
 * Full bleed on purpose: the strips run off the right edge of the screen so it
 * reads as a set that continues, which is also the direction everything else on
 * the site moves in.
 */
export default function ShootStrips({ shoots }: { shoots: ReturnType<typeof orderedShoots> }) {
  return (
    <>
      {shoots.map((shoot, i) => {
        return (
          <div key={shoot.key} className="pt-[3.5em] pb-[1em]">
            <div className="px-[var(--gutter)]">
              <div className="rule mb-[1.5em] flex items-baseline justify-between gap-[1.5em] border-t pt-[1.1em]">
                <h2 className="statement text-[clamp(18px,2vw,28px)]">{shoot.label}</h2>
                <span className="label opacity-60">
                  ({String(i + 1).padStart(2, "0")}) {shoot.photos.length} frames
                </span>
              </div>
            </div>

            {/* The first strip is above the fold, so its opening frames are the page's largest paint. */}
            <Carousel photos={[...shoot.photos]} label={shoot.label} eager={i === 0 ? 3 : 0} />
          </div>
        );
      })}
    </>
  );
}

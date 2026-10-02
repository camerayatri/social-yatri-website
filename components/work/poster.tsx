import Image from "next/image";

import type { Photo } from "@/lib/content";

/**
 * The frame that carries a piece of work.
 *
 * The surfaces are black and white; the photography is where the colour lives.
 *
 * Real footage replaces this component and nothing else: each ride names its
 * own frame in `lib/content.ts`.
 */
export default function Poster({
  photo,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  preload = false,
}: {
  photo: Photo;
  className?: string;
  sizes?: string;
  preload?: boolean;
}) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        preload={preload}
        className="object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]"
        style={{
          transitionTimingFunction: "var(--ease-brand)",
          objectPosition: photo.focus,
        }}
      />
    </div>
  );
}

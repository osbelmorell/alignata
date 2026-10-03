import { ART_H, ART_W } from "@/lib/daily-digest/meta";

/**
 * Sticker art slot: the one 16:9 file, padded and never cropped (object-fit: contain on the item's own colour).
 * The card and the story hero render the same URL at the same intrinsic size, so the hero is already cached.
 */
export function ArtFigure({
  slug,
  className,
  src,
  alt,
  pad,
  eager = false,
  hero = false,
}: {
  slug: string;
  className: string;
  src: string;
  alt: string;
  pad: string;
  eager?: boolean;
  hero?: boolean;
}) {
  return (
    <figure className={className} style={{ "--art-pad": pad } as React.CSSProperties} data-art={slug}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={ART_W}
        height={ART_H}
        {...(hero || eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
        decoding="async"
      />
    </figure>
  );
}

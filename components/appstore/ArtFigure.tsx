import { ART_H, ART_W } from "@/lib/daily-digest/meta";
import { Img } from "@/components/appstore/Img";
import { Morph } from "@/components/appstore/Motion";

/**
 * Sticker art slot: the one 16:9 file in a 16:9 slot (object-fit: cover; slot ratio = art ratio, so nothing is cropped).
 * The card and the story hero render the same URL at the same intrinsic size, so the hero is already cached.
 * Both sides share the morph name art-<slug> (SPEC v2 §7).
 */
export function ArtFigure({
  slug,
  className,
  src,
  alt,
  pad,
  eager = false,
  hero = false,
  sizes,
  morph = true,
}: {
  slug: string;
  className: string;
  src: string;
  alt: string;
  pad: string;
  eager?: boolean;
  hero?: boolean;
  sizes?: string;
  /** False when this slug's art is already on the page (listing picks above the feed). One art-<slug> name, so the feed card still morphs to the story. */
  morph?: boolean;
}) {
  const figure = (
    <figure className={className} style={{ "--art-pad": pad } as React.CSSProperties} data-art={slug}>
      <Img
        src={src}
        alt={alt}
        width={ART_W}
        height={ART_H}
        sizes={sizes ?? (hero ? "(max-width: 899.98px) 100vw, 680px" : undefined)}
        {...(hero || eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
        decoding="async"
      />
    </figure>
  );
  if (!morph) return figure;
  return <Morph name={`art-${slug}`}>{figure}</Morph>;
}

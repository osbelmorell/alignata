import { Img } from "@/components/appstore/Img";

/** Restyle C page illustration (home, /apps, /daily-digest heads). Decorative: the heading says what the page is. */
export function PageHero({ src, eager = false }: { src: string; eager?: boolean }) {
  return (
    <figure className="fx-page-hero" aria-hidden="true">
      <Img src={src} alt="" width={1920} height={1080} decoding="async" {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })} />
    </figure>
  );
}

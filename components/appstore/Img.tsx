"use client";

import BLUR from "@/lib/art/blur.json";
import { ART_WIDTHS, ICON_WIDTHS, variantPath } from "@/lib/art/variants";

/**
 * <img> that never holds a navigation. Inside a <ViewTransition>, React waits up to ~800ms for a non-lazy image that
 * isn't loaded yet before it commits; an onLoad handler opts the image out (react-dom maySuspendCommit). SPEC v2 §1
 * rule 6: taps never wait on animation. Cached art (the card was on screen) still morphs with its pixels; uncached
 * art morphs as its pad colour and fills in when it arrives.
 *
 * Every /art image sits in a fixed-size frame (.fx-ph) that shows a blurred preview of itself (a 16px webp made at
 * build time, lib/art/blur.json) over a soft pastel shimmer until the pixels arrive, then fades in over 200ms.
 * The frame takes `className`, so it keeps the slot's size from first paint (CLS 0). srcSet points at build-time
 * 640/960/1280 (art) or 128 (icon) variants. Without JS the image just paints over the blur, no fade.
 */
type Entry = { w: number; b: string };
const MAP = BLUR as Record<string, Entry>;

const pending = (img: HTMLImageElement | null) => {
  if (img && !img.complete) img.setAttribute("data-pending", "");
};
const done = (e: React.SyntheticEvent<HTMLImageElement>) => e.currentTarget.removeAttribute("data-pending");

export function Img({ className, sizes, style, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const src = typeof props.src === "string" ? props.src : "";
  const hit = MAP[src];
  const widths = hit ? (hit.w >= 1920 ? ART_WIDTHS : ICON_WIDTHS).filter((w) => w < hit.w) : [];
  const srcSet = hit ? [...widths.map((w) => `${variantPath(src, w)} ${w}w`), `${src} ${hit.w}w`].join(", ") : undefined;
  return (
    <span className={className ? `fx-ph ${className}` : "fx-ph"} style={hit ? ({ ...style, "--ph": `url("${hit.b}")` } as React.CSSProperties) : style}>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img {...props} srcSet={srcSet} sizes={srcSet ? (sizes ?? (hit!.w >= 1920 ? "(max-width: 899.98px) 100vw, 640px" : "56px")) : sizes} ref={pending} onLoad={done} onError={done} />
    </span>
  );
}

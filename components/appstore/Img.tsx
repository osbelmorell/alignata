"use client";

/**
 * <img> that never holds a navigation. Inside a <ViewTransition>, React waits up to ~800ms for a non-lazy image that
 * isn't loaded yet before it commits; an onLoad handler opts the image out (react-dom maySuspendCommit). SPEC v2 §1
 * rule 6: taps never wait on animation. Cached art (the card was on screen) still morphs with its pixels; uncached
 * art morphs as its pad colour and fills in when it arrives.
 */
const noop = () => {};

export function Img(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...props} onLoad={noop} />;
}

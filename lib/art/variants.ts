/** Responsive widths made at build time by scripts/art-variants.mjs (16:9 art is 1920 wide, icons 256). */
export const ART_WIDTHS = [640, 960, 1280] as const;
export const ICON_WIDTHS = [128] as const;
/** /art/digest/x.webp → /art/_r/digest/x-640.webp */
export const variantPath = (src: string, w: number) => src.replace(/^\/art\//, "/art/_r/").replace(/\.webp$/, `-${w}.webp`);

/**
 * THE motion switch (SPEC v2 §7 + §11 build order 4): every v2 transition sits behind this one flag, so motion can be
 * turned off without rolling back the layout.
 *
 * On (default): React <ViewTransition> card→story morphs (art-<slug>, title-<slug>, icon-<slug>, share="morph"),
 * the 150ms page crossfade (200ms fade-in on stories), the still header, the card press scale and the sticky Open
 * bar's slide-up. prefers-reduced-motion still removes all movement (app/motion.css).
 *
 * Off: set the Vercel env var NEXT_PUBLIC_MOTION=off (Production and/or Preview) and redeploy (it is inlined at
 * build time). No <ViewTransition> is rendered, <html data-motion="off"> drops every motion rule, pages swap
 * instantly, and the layout is byte-for-byte the same. Any other value, or unset, means on.
 */
export const MOTION_ON: boolean = process.env.NEXT_PUBLIC_MOTION !== "off";

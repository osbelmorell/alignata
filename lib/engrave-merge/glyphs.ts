/** Emoji and font-glyph checks (SPEC §6.3 EMOJI / MISSING_GLYPH, §6.5). */

const EXT_PICT = new RegExp("^\\p{Extended_Pictographic}$", "u");
const EMOJI_EXEMPT = new Set([0x00a9, 0x00ae, 0x2122]); // © ® ™
export const IGNORABLE = new Set([0xfe0e, 0xfe0f, 0x200d, 0x20e3]);

export function isEmojiChar(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  if (EMOJI_EXEMPT.has(cp)) return false;
  return EXT_PICT.test(ch);
}

/** Returns true when the font has a glyph for this code point. */
export type GlyphCheck = (cp: number) => boolean;

/** Glyph check built from a plain character list (used by tests / the ASCII stand-in). */
export function charsetCheck(chars: string): GlyphCheck {
  const set = new Set<number>();
  for (const ch of chars) if (ch !== "\r" && ch !== "\n") set.add(ch.codePointAt(0)!);
  return (cp) => set.has(cp);
}

export interface LoadedFont {
  name: string;
  check: GlyphCheck;
}

interface OpentypeLike {
  parse(buf: ArrayBuffer): {
    names: unknown;
    charToGlyphIndex(ch: string): number;
  };
}

/** Build a glyph check from an already-loaded opentype.js module (testable in Node). */
export function fontFrom(opentype: OpentypeLike, buf: ArrayBuffer): LoadedFont {
  const font = opentype.parse(buf);
  const names = font.names as Record<string, Record<string, string> | undefined>;
  const name = names.fullName?.en || names.fontFamily?.en || "your font";
  return { name, check: (cp) => font.charToGlyphIndex(String.fromCodePoint(cp)) !== 0 };
}

/**
 * Parse a TTF/OTF entirely in memory with opentype.js (loaded on demand with dynamic
 * import, bundled, never from a CDN). The font is never uploaded or stored.
 */
export async function loadFont(buf: ArrayBuffer): Promise<LoadedFont> {
  const mod = (await import("opentype.js")) as unknown as OpentypeLike & { default?: OpentypeLike };
  return fontFrom(mod.default ?? mod, buf);
}

/** The URL people share (Share, CEO Oct 11 2026): the canonical page URL plus utm_source=share only (no ref). */
export function shareUrl(canonicalPath: string, origin = "https://alignata.com"): string {
  return `${origin}${canonicalPath}?utm_source=share`;
}

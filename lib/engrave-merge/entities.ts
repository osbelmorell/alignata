import { decodeHTML } from "entities";

/**
 * Decode HTML entities (named, &#NN; and &#xHH;) as a pure function, never innerHTML,
 * then normalise CRLF / CR to LF. Mirrors Python html.unescape + newline normalisation.
 */
export function decodeEntities(s: string | undefined | null): string {
  return decodeHTML(s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

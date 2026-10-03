/**
 * Daily Digest author and bylines (board GO, Oct 3 2026).
 * - Essays: "By Osbel Morell" + AUTHOR_BIO; JSON-LD author = Person.
 * - Techniques (every other article, incl. deep dives): "Daily Digest · Edited by Osbel Morell"; JSON-LD author =
 *   Organization "Alignata Daily Digest", editor = Person.
 *
 * AUTHOR_BIO is pending Product Copy, Brand Creator and Voice Gate. It ships as the placeholder below until then;
 * `npm run test:release` (scripts/assert-release.mjs) FAILS while the placeholder is still here, and is run before merge.
 */
export const AUTHOR_NAME = "Osbel Morell";
/** Marker the release check looks for. Do not reuse it anywhere else. */
export const BIO_PLACEHOLDER_MARKER = "BIO_PLACEHOLDER";
/** One-line bio under an essay byline. Replace the whole string with the approved line (no marker left). */
export const AUTHOR_BIO = "BIO_PLACEHOLDER — pending Voice Gate";
/** Organization credited as author of technique articles (there is no other publisher entity on the site). */
export const DIGEST_ORG_NAME = "Alignata Daily Digest";
export const TECHNIQUE_BYLINE = `Daily Digest · Edited by ${AUTHOR_NAME}`;
export const ESSAY_BYLINE = `By ${AUTHOR_NAME}`;

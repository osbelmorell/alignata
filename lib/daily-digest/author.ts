/**
 * Daily Digest author and bylines (board GO, Oct 3 2026).
 * - Essays: "By Osbel Morell" + AUTHOR_BIO; JSON-LD author = Person.
 * - Techniques (every other article, incl. deep dives): "Daily Digest · Edited by Osbel Morell"; JSON-LD author =
 *   Organization "Alignata Daily Digest", editor = Person.
 *
 * AUTHOR_BIO: approved by the board 6:38 AM ET Oct 3 2026 (Brand Creator passed, Voice Gate cleared, Product Copy confirmed).
 * Never name an employer here. `npm run test:release` (scripts/assert-release.mjs) fails if a placeholder returns.
 */
export const AUTHOR_NAME = "Osbel Morell";
/** Marker the release check looks for. Do not reuse it anywhere else. */
export const BIO_PLACEHOLDER_MARKER = "BIO_PLACEHOLDER";
/** One-line bio under an essay byline. Replace the whole string with the approved line (no marker left). */
export const AUTHOR_BIO = "Osbel Morell is a software engineering leader who builds small tools at Alignata.";
/** Organization credited as author of technique articles (there is no other publisher entity on the site). */
export const DIGEST_ORG_NAME = "Alignata Daily Digest";
export const TECHNIQUE_BYLINE = `Daily Digest · Edited by ${AUTHOR_NAME}`;
export const ESSAY_BYLINE = `By ${AUTHOR_NAME}`;

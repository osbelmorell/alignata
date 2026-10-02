/**
 * file_fingerprint (SPEC §8.2): lowercase hex SHA-256 of the unique, trimmed, non-blank
 * Order IDs sorted as strings and joined with "\n". Computed over ALL rows (before the
 * shipped filter). Used only to count distinct real files; never leaves the browser
 * unless the file has at least MIN_ORDERS_FOR_FINGERPRINT distinct Order IDs.
 */
export const MIN_ORDERS_FOR_FINGERPRINT = 3;

export async function fingerprintOf(sortedOrderIds: string[]): Promise<string> {
  const data = new TextEncoder().encode(sortedOrderIds.join("\n"));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

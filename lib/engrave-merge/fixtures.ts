/**
 * Fingerprints of the bundled synthetic fixtures (fixtures/fixture_fingerprints.json).
 * Events carrying one of these are dropped by the server and ignored by the KPI script.
 */
export const FIXTURE_FINGERPRINTS: readonly string[] = [
  "290fd4eb011e98dbdbacd8768b45631fc8c776861dc865fa46735c87d93a1b7d", // fx01_simple.csv
  "f90375c1c03ae72ca2e0376d6fcb963f5e5a40380a299d41aac6c9ce2abd85c5", // fx02_quantity.csv
  "1201ee2515fcdbe4b5da02d900ffc328da87aaee4ca19e0bc8ab5ee7f085a4ff", // fx03_multiline_commas.csv
  "89aac1e4f1352665284e1eae239431eea53b36d916513c371ba1cacfcdf8e474", // fx04_mixed_shipped.csv
  "9efedfb15b6fed116716e22dc3d80528bc2f5cf768b67580db0088cf22369aab", // fx05_exceptions.csv
  "ac87337fa7b8e903c6f300cfb1510edb50049dd2a1c79117bc3a8042f3fca5b2", // fx06_multifield_GUESS.csv
];

export function isFixtureFingerprint(fp: string | undefined | null): boolean {
  return !!fp && FIXTURE_FINGERPRINTS.includes(fp);
}

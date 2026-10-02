/**
 * Deterministic date formatting for the scorecard: fixed locale + time zone so the
 * server (UTC on Vercel) and the browser render the same text (no hydration
 * mismatch, React #418). America/New_York is the board's zone, labeled "ET".
 */
const LOCALE = "en-US";
const TIME_ZONE = "America/New_York";

export function formatScorecardDate(iso: string, dateStyle: "medium" | "full" = "medium"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Every caller shows a time, so always label the zone ("ET" covers EST and EDT).
  return `${d.toLocaleString(LOCALE, { dateStyle, timeStyle: "short", timeZone: TIME_ZONE })} ET`;
}

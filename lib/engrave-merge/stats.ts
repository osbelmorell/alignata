/**
 * Public Engrave Merge stats. Aggregates from computeKpis only.
 * Never returns raw events, install ids, fingerprints, or store credentials.
 */
import { computeKpis, WINDOW_DAYS, type KpiReport } from "./kpis";
import { readEvents } from "./store";

export const STATS_CACHE_SECONDS = 600;

export type EngraveMergeStats = KpiReport & {
  /** Kill-bar length. since/until are [T0, T0 + windowDays), null until the first real file. */
  windowDays: typeof WINDOW_DAYS;
  since: string | null;
  until: string | null;
};

export function toPublicStats(events: readonly unknown[], now = Date.now()): EngraveMergeStats {
  const k = computeKpis(events, now);
  return { windowDays: WINDOW_DAYS, since: k.t0, until: k.windowEnd, ...k };
}

const cached = {
  "Cache-Control": `public, max-age=${STATS_CACHE_SECONDS}, s-maxage=${STATS_CACHE_SECONDS}`,
};
const uncached = { "Cache-Control": "no-store" };

/** Drop URLs and bearer material before a failure is written to the log. */
function safeError(err: unknown): string {
  const message = err instanceof Error ? err.message : "error";
  return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/https?:\/\/\S+/gi, "[url]");
}

/** GET /api/engrave-merge/stats. Read-only. Counts only. */
export async function handleStats(env: Record<string, string | undefined> = process.env, now = Date.now()): Promise<Response> {
  try {
    const events = await readEvents(env);
    return Response.json(toPublicStats(events, now), { headers: cached });
  } catch (err) {
    console.error(`[engrave-merge] stats unavailable: ${safeError(err)}`);
    return Response.json({ error: "stats_unavailable" }, { status: 503, headers: uncached });
  }
}

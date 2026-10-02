import { MAX_BODY_BYTES, PROD_HOST, nyDay, validateEvent } from "./events";
import { isExcludedIid, isFixtureFingerprint } from "./fixtures";
import { appendEvent, redisConfig } from "./store";

/**
 * What happened to an accepted event, sent back as `x-em-store` (status stays 204, body empty):
 * stored = appended to the store; skipped-config = no store env vars; skipped-filter = fixture
 * fingerprint or EXCLUDED_IIDS device; error = the store call failed. Dogfood events are stored
 * (flagged dogfood: true) so we can confirm the pipeline; the KPI script ignores them.
 */
export type StoreResult = "stored" | "skipped-config" | "skipped-filter" | "error";
const noContent = (result: StoreResult, event: string) => {
  // One line, no ids or values.
  console.log(`[engrave-merge] event ${event} ${result}`);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "x-em-store": result } });
};
const bad = (reason: string) =>
  Response.json({ error: "bad_request", reason }, { status: 400, headers: { "Cache-Control": "no-store" } });

/**
 * POST handler for Engrave Merge count events.
 * - Re-validates against the allow-list (unknown keys / bad types / > 1 KB → 400).
 * - Drops events whose fingerprint is a bundled fixture (204, nothing stored).
 * - Drops events from owner/test devices listed in EXCLUDED_IIDS (204, nothing stored).
 * - Adds ts (server time), day (America/New_York) and host; marks prod = host is alignata.com.
 * - Stores nothing about the caller (no IP, no user agent).
 * - No store configured → validated, then 204 no-op.
 * - Every 204 carries `x-em-store` (stored | skipped-config | skipped-filter | error) and logs one line
 *   `[engrave-merge] event <name> <result>` (no ids, no values).
 */
export async function handleEvent(
  request: Request,
  opts: { excludedIids?: readonly string[] } = {},
): Promise<Response> {
  const len = Number(request.headers.get("content-length") || "0");
  if (len > MAX_BODY_BYTES) return bad("too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return bad("too_large");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return bad("not_json");
  }
  const v = validateEvent(raw);
  if (!v.ok) return bad(v.reason);
  const ev = v.event;
  const fp = ev.props.file_fingerprint;
  if (typeof fp === "string" && isFixtureFingerprint(fp)) return noContent("skipped-filter", ev.event);
  if (isExcludedIid(ev.iid, opts.excludedIids)) return noContent("skipped-filter", ev.event);

  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host)
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  const ts = Date.now();
  const record = { ...ev, ts, day: nyDay(ts), host, prod: host === PROD_HOST };
  const line = JSON.stringify(record);

  const cfg = redisConfig();
  if (!cfg) return noContent("skipped-config", ev.event);
  try {
    // storage failure must never surface to the tool (still 204)
    return noContent((await appendEvent(cfg, record.day, line)) ? "stored" : "error", ev.event);
  } catch {
    return noContent("error", ev.event);
  }
}

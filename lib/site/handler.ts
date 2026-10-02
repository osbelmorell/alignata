import { SITE_MAX_BODY_BYTES, SITE_PROD_HOST, nyDay, validateSiteEvent } from "./events";
import { appendSiteEvent, redisConfig } from "./store";

/**
 * What happened to an accepted site event, sent back as `x-site-store` (status 204, empty body):
 * stored = appended to the store; skipped-config = no store env vars; error = the store call failed.
 * Dogfood events are stored (flagged dogfood: true) so the pipeline can be checked; the baseline
 * script ignores them. The owner device and automated browsers never send (client-side skip).
 */
export type SiteStoreResult = "stored" | "skipped-config" | "error";
const noContent = (result: SiteStoreResult, event: string) => {
  console.log(`[site] event ${event} ${result}`); // one line, no ids or values
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "x-site-store": result } });
};
const bad = (reason: string) =>
  Response.json({ error: "bad_request", reason }, { status: 400, headers: { "Cache-Control": "no-store" } });

/** POST handler: re-validate (allow-list, ≤ 1 KB), add ts/day/host/prod, store. No IP or user agent is kept. */
export async function handleSiteEvent(request: Request): Promise<Response> {
  const len = Number(request.headers.get("content-length") || "0");
  if (len > SITE_MAX_BODY_BYTES) return bad("too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > SITE_MAX_BODY_BYTES) return bad("too_large");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return bad("not_json");
  }
  const v = validateSiteEvent(raw);
  if (!v.ok) return bad(v.reason);
  const ev = v.event;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host)
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  const ts = Date.now();
  const record = { ...ev, ts, day: nyDay(ts), host, prod: host === SITE_PROD_HOST };
  const cfg = redisConfig();
  if (!cfg) return noContent("skipped-config", ev.event);
  try {
    return noContent((await appendSiteEvent(cfg, record.day, JSON.stringify(record))) ? "stored" : "error", ev.event);
  } catch {
    return noContent("error", ev.event);
  }
}

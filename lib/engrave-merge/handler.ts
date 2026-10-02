import { MAX_BODY_BYTES, PROD_HOST, nyDay, validateEvent } from "./events";
import { isFixtureFingerprint } from "./fixtures";
import { appendEvent, redisConfig } from "./store";

const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const bad = (reason: string) =>
  Response.json({ error: "bad_request", reason }, { status: 400, headers: { "Cache-Control": "no-store" } });

/**
 * POST handler for Engrave Merge count events.
 * - Re-validates against the allow-list (unknown keys / bad types / > 1 KB → 400).
 * - Drops events whose fingerprint is a bundled fixture (204, nothing stored).
 * - Adds ts (server time), day (America/New_York) and host; marks prod = host is alignata.com.
 * - Stores nothing about the caller (no IP, no user agent).
 * - No store configured → validated, then 204 no-op.
 */
export async function handleEvent(request: Request): Promise<Response> {
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
  if (typeof fp === "string" && isFixtureFingerprint(fp)) return noContent();

  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host)
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  const ts = Date.now();
  const record = { ...ev, ts, day: nyDay(ts), host, prod: host === PROD_HOST };
  const line = JSON.stringify(record);
  console.log(`[engrave-merge-event] ${line}`);

  const cfg = redisConfig();
  if (!cfg) return noContent();
  try {
    await appendEvent(cfg, record.day, line);
  } catch {
    // storage failure must never surface to the tool
  }
  return noContent();
}

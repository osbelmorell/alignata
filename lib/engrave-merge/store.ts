/**
 * Event store: Upstash Redis (free tier) over its REST API. Server-only.
 * Configured when either env pair is present (the Vercel Marketplace Upstash/KV
 * integration injects KV_REST_API_URL + KV_REST_API_TOKEN; a direct Upstash setup
 * uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Missing → no-op.
 */
export const EVENT_TTL_SECONDS = 120 * 24 * 60 * 60;
export const eventKey = (day: string) => `em:ev:${day}`;

export function redisConfig(env: Record<string, string | undefined> = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export async function appendEvent(cfg: { url: string; token: string }, day: string, line: string): Promise<boolean> {
  const key = eventKey(day);
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["RPUSH", key, line],
      ["EXPIRE", key, String(EVENT_TTL_SECONDS)],
    ]),
    cache: "no-store",
  });
  return res.ok;
}

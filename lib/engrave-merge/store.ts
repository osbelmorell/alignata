/**
 * Event store: Upstash Redis (free tier) over its REST API. Server-only.
 * Configured when either env pair is present (the Vercel Marketplace Upstash/KV
 * integration injects KV_REST_API_URL + KV_REST_API_TOKEN; a direct Upstash setup
 * uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Missing → no-op.
 */
export const EVENT_TTL_SECONDS = 120 * 24 * 60 * 60;
/**
 * Every Redis key Engrave Merge writes or reads starts with this ONE prefix, so it can share a store
 * (e.g. upstash-kv-crimson-flower) without colliding with anything else. Writes: em:ev:<YYYY-MM-DD>
 * (RPUSH + EXPIRE). Reads (KPI script and GET /api/engrave-merge/stats): SCAN MATCH em:ev:* then LRANGE.
 * Nothing else. Reads prefer the read-only token; writes keep the read-write token.
 */
export const EM_KEY_PREFIX = "em:";
export const eventKey = (day: string) => `${EM_KEY_PREFIX}ev:${day}`;
export const EVENT_KEY_MATCH = `${EM_KEY_PREFIX}ev:*`;

export function redisConfig(env: Record<string, string | undefined> = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

/** Read path. Prefers the read-only token so a stats response never needs the write credential. */
export function readOnlyRedisConfig(env: Record<string, string | undefined> = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_READ_ONLY_TOKEN || env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

async function redisCommand(cfg: { url: string; token: string }, cmd: string[]): Promise<unknown> {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${cmd[0]} failed: HTTP ${res.status}`);
  return ((await res.json()) as { result?: unknown }).result;
}

/**
 * Read every stored Engrave Merge event. SCAN + LRANGE on em:ev:* only. No writes.
 * Malformed lines are skipped. Throws when the store is not configured (same message as the KPI CLI).
 */
export async function readEvents(env: Record<string, string | undefined> = process.env): Promise<unknown[]> {
  const cfg = readOnlyRedisConfig(env);
  if (!cfg) {
    throw new Error(
      "No event store configured. Set KV_REST_API_URL + KV_REST_API_READ_ONLY_TOKEN (or KV_REST_API_TOKEN), " +
        "or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or pass --file log.jsonl.",
    );
  }
  const keys = new Set<string>();
  let cursor = "0";
  let pages = 0;
  do {
    if (++pages > 100) throw new Error("Redis SCAN failed: too many pages");
    const scanned = await redisCommand(cfg, ["SCAN", cursor, "MATCH", EVENT_KEY_MATCH, "COUNT", "1000"]);
    const next = Array.isArray(scanned) ? scanned[0] : undefined;
    const batch = Array.isArray(scanned) ? scanned[1] : undefined;
    if (!Array.isArray(batch)) throw new Error("Redis SCAN failed: bad result");
    for (const k of batch) if (typeof k === "string" && k.startsWith(`${EM_KEY_PREFIX}ev:`)) keys.add(k);
    cursor = String(next);
  } while (cursor !== "0");
  const events: unknown[] = [];
  for (const k of [...keys].sort()) {
    const lines = await redisCommand(cfg, ["LRANGE", k, "0", "-1"]);
    if (!Array.isArray(lines)) throw new Error("Redis LRANGE failed: bad result");
    for (const l of lines) {
      if (typeof l !== "string") continue;
      try {
        events.push(JSON.parse(l) as unknown);
      } catch {
        /* skip malformed */
      }
    }
  }
  return events;
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

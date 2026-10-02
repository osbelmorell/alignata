import { redisConfig } from "@/lib/engrave-merge/store";

/**
 * Site event store: the same Upstash Redis REST store and env vars as Engrave Merge
 * (upstash-kv-crimson-flower, shared with other apps). Every key the site tracker writes or reads
 * starts with this ONE prefix, so it never touches em:*, ahadle:*, markets:* or seo:*.
 * Writes: site:ev:<YYYY-MM-DD America/New_York> (RPUSH + EXPIRE). Reads (baseline script): SCAN MATCH
 * site:ev:* then LRANGE. Nothing else.
 */
export const SITE_KEY_PREFIX = "site:";
export const SITE_EVENT_TTL_SECONDS = 180 * 24 * 60 * 60;
export const siteEventKey = (day: string) => `${SITE_KEY_PREFIX}ev:${day}`;
export const SITE_EVENT_KEY_MATCH = `${SITE_KEY_PREFIX}ev:*`;
export { redisConfig };

export async function appendSiteEvent(cfg: { url: string; token: string }, day: string, line: string): Promise<boolean> {
  const key = siteEventKey(day);
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["RPUSH", key, line],
      ["EXPIRE", key, String(SITE_EVENT_TTL_SECONDS)],
    ]),
    cache: "no-store",
  });
  return res.ok;
}

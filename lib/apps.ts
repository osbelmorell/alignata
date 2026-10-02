import catalog from "@/public/apps.json";
import type { AppsCatalog, HubApp } from "@/lib/types";

const data = catalog as AppsCatalog;

export function getApps(): HubApp[] {
  return data.apps ?? [];
}

/** Live apps first, then alphabetical by name within each group. */
export function sortApps(apps: HubApp[]): HubApp[] {
  return [...apps].sort((a, b) => {
    const aLive = a.status === "live" ? 0 : 1;
    const bLive = b.status === "live" ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return a.name.localeCompare(b.name);
  });
}

/** SPEC §6: the two tools with custom art lead (01, 02); the rest follow A–Z by name on the fallback tile. */
export const FEATURED_TOOLS = ["stripe-cleaver", "license-gate"] as const;

const ART: Record<string, { file: string; alt: string }> = {
  "stripe-cleaver": { file: "stripe-cleaver", alt: "A black cleaver cutting through a stack of loose paper beside a closed ledger book." },
  "license-gate": { file: "license-gate", alt: "A small clay gate: a black bar between two stone posts, with a lime button on top." },
};

export function toolsOrder(apps: HubApp[]): HubApp[] {
  const live = apps.filter((a) => a.status === "live");
  const featured = FEATURED_TOOLS.map((id) => live.find((a) => a.id === id)).filter((a): a is HubApp => !!a);
  const rest = live.filter((a) => !(FEATURED_TOOLS as readonly string[]).includes(a.id)).sort((a, b) => a.name.localeCompare(b.name, "en"));
  return [...featured, ...rest];
}

/** Card art: custom for the featured tools, the shared fallback tile (decorative, empty alt) for the others. */
export function toolArt(id: string): { file: string; alt: string; featured: boolean } {
  const a = ART[id];
  return a ? { ...a, featured: true } : { file: "fallback-tile", alt: "", featured: false };
}

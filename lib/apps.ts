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

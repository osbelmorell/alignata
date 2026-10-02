import { localDate } from "./outputs";
import { DEFAULT_SETTINGS, type ListingRecipe, type Recipe, type Settings } from "./types";

/** Settings file ("recipe", SPEC §6.6): settings, labels, listing IDs and titles only. */
export const RECIPE_FILE_NAME = "engrave-merge-settings.json";
export const RECIPE_MAX_BYTES = 200 * 1024;

const str = (v: unknown, max = 200): string | null =>
  typeof v === "string" && v.length <= max ? v : null;
const int = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null;

function cleanListing(v: unknown): ListingRecipe | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const out: ListingRecipe = {};
  const itemName = str(o.itemName);
  if (itemName !== null) out.itemName = itemName;
  for (const k of ["option1", "option2", "option3"] as const) {
    if (o[k] === null) out[k] = null;
    else if (str(o[k], 40) !== null) out[k] = o[k] as string;
  }
  if (Array.isArray(o.textFields)) {
    out.textFields = o.textFields.filter((x): x is string => str(x, 40) !== null).slice(0, 20);
  }
  if (typeof o.requiresPersonalization === "boolean") out.requiresPersonalization = o.requiresPersonalization;
  // null / missing = "use the main letter limit" (the reference parser would read null as 0 = off)
  if (int(o.charLimit, 0, 1000) !== null) out.charLimit = o.charLimit as number;
  return out;
}

/** Validate an uploaded settings file. Unknown keys are ignored. */
export function parseRecipe(text: string, byteSize: number): { recipe?: Recipe; error?: string } {
  if (byteSize > RECIPE_MAX_BYTES) return { error: "too_big" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "not_json" };
  }
  if (!raw || typeof raw !== "object" || (raw as Record<string, unknown>).tool !== "engrave-merge") {
    return { error: "not_ours" };
  }
  const o = raw as Record<string, unknown>;
  const recipe: Recipe = { tool: "engrave-merge", recipeVersion: 1 };
  const s = o.settings;
  if (s && typeof s === "object" && !Array.isArray(s)) {
    const so = s as Record<string, unknown>;
    const settings: Partial<Settings> = {};
    for (const k of ["includeShipped", "includeFlagged", "splitLines", "stripNumbers"] as const) {
      if (typeof so[k] === "boolean") settings[k] = so[k] as boolean;
    }
    const lc = int(so.lineColumns, 1, 10);
    if (lc !== null) settings.lineColumns = lc;
    const cl = int(so.charLimit, 0, 1000);
    if (cl !== null) settings.charLimit = cl;
    recipe.settings = settings;
  }
  if (Array.isArray(o.extraLabels)) {
    recipe.extraLabels = o.extraLabels.filter((x): x is string => str(x, 40) !== null).slice(0, 100);
  }
  if (o.listings && typeof o.listings === "object" && !Array.isArray(o.listings)) {
    const listings: Record<string, ListingRecipe> = {};
    for (const [lid, v] of Object.entries(o.listings as Record<string, unknown>)) {
      if (!/^[0-9]{1,20}$/.test(lid)) continue;
      const l = cleanListing(v);
      if (l) listings[lid] = l;
    }
    recipe.listings = listings;
  }
  return { recipe };
}

/** Build the settings file. Holds only settings, labels, listing IDs and listing titles. */
export function buildRecipe(
  settings: Settings,
  listings: Record<string, ListingRecipe>,
  extraLabels: string[] = [],
  now = new Date(),
): Recipe {
  const clean: Record<string, ListingRecipe> = {};
  for (const [lid, l] of Object.entries(listings)) {
    const c = cleanListing(l);
    if (!c) continue;
    const entry: ListingRecipe = {
      itemName: c.itemName ?? "",
      option1: c.option1 ?? null,
      option2: c.option2 ?? null,
      option3: c.option3 ?? null,
      textFields: c.textFields ?? [],
    };
    if (typeof c.requiresPersonalization === "boolean") entry.requiresPersonalization = c.requiresPersonalization;
    if (typeof c.charLimit === "number") entry.charLimit = c.charLimit;
    clean[lid] = entry;
  }
  const s: Settings = { ...DEFAULT_SETTINGS, ...settings };
  return {
    tool: "engrave-merge",
    recipeVersion: 1,
    savedAt: localDate(now),
    settings: {
      includeShipped: s.includeShipped,
      includeFlagged: s.includeFlagged,
      splitLines: s.splitLines,
      lineColumns: s.lineColumns,
      charLimit: s.charLimit,
      stripNumbers: s.stripNumbers,
    },
    extraLabels,
    listings: clean,
  };
}

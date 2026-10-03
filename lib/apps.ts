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

/** SPEC §5: Cleaver 01 and License Gate 02 lead; the other 9 follow A–Z by name, so positions 1–11 are unchanged. */
export const FEATURED_TOOLS = ["stripe-cleaver", "license-gate"] as const;

/**
 * Tool art (SPEC v2, sticker batch v3.1; alt lines FINAL from Brand Creator, ART-ALT-DRAFT.md "Tools: FINAL alt text").
 * `art` = one 16:9 file (1920×1080) for the card AND the story hero, never cropped (object-fit: contain on `pad`, the
 * tool's ART-PALETTE colour). `icon` = the square row icon. Deploy Decision Card is icon-only: it has no story page
 * and never appears in the feed (CEO, 7:40 PM ET Oct 2), so it has no hero.
 */
export type ToolArt = { art: string | null; alt: string; icon: string; iconAlt: string; pad: string };

const art = (id: string, pad: string, alt: string | null, iconAlt: string): ToolArt => ({
  art: alt ? `/art/${id}-sticker.webp` : null,
  alt: alt ?? "",
  icon: `/art/${id}-sticker-icon.webp`,
  iconAlt,
  pad,
});

export const TOOL_ART: Record<string, ToolArt> = {
  "stripe-cleaver": art("stripe-cleaver", "#8384B8", "A big cleaver slices a paper receipt into torn strips, with the fee strip in yellow.", "A cartoon cleaver with a steel blade and a black handle."),
  "license-gate": art("license-gate", "#B94C4A", "A padlock with a brass shackle clamped shut on a rolled paper scroll.", "A padlock with a brass shackle."),
  "agent-bundle-tag": art("agent-bundle-tag", "#96E4B7", "A pink luggage tag tied with string to a wrapped paper parcel.", "A pink luggage tag."),
  "agent-eval-go-no-go": art("agent-eval-go-no-go", "#F0CD5F", "A black and white checkered flag waving on a pole.", "A checkered flag."),
  "deploy-decision-card": art("deploy-decision-card", "#EE83C3", null, "A balance scale with two brass pans."),
  "engrave-merge": art("engrave-merge", "#EFC3BB", "A laser engraver on a rail burning a line onto a paper tag.", "A laser engraver burning a line onto a tag."),
  "enterprise-scorecard": art("enterprise-scorecard", "#C5C6FB", "A round pressure gauge with green, yellow and red bands and one needle.", "A pressure gauge."),
  "env-diff-snapshot": art("env-diff-snapshot", "#96E4B7", "A magnifying glass over two paper sheets whose lines don't match up.", "A magnifying glass."),
  "hobby-deploy-burn-digest": art("hobby-deploy-burn-digest", "#B94C4A", "A lit match, half burnt down, with a yellow flame.", "A lit match."),
  "llm-feature-cost-tag": art("llm-feature-cost-tag", "#F0CD5F", "A pink price tag hanging from a steel cog.", "A steel cog with a pink price tag."),
  "what-changed-card": art("what-changed-card", "#EE83C3", "A rubber stamp lifting off a paper sheet, leaving a round mark.", "A rubber stamp."),
};

export function toolsOrder(apps: HubApp[]): HubApp[] {
  const live = apps.filter((a) => a.status === "live");
  const featured = FEATURED_TOOLS.map((id) => live.find((a) => a.id === id)).filter((a): a is HubApp => !!a);
  const rest = live.filter((a) => !(FEATURED_TOOLS as readonly string[]).includes(a.id)).sort((a, b) => a.name.localeCompare(b.name, "en"));
  return [...featured, ...rest];
}

/** Art for a tool in the catalog (every listed tool has an entry; the test suite checks the files exist). */
export function toolArt(id: string): ToolArt {
  const a = TOOL_ART[id];
  if (!a) throw new Error(`No art for tool ${id}`);
  return a;
}

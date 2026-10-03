import catalog from "@/public/apps.json";
import type { AppsCatalog, HubApp } from "@/lib/types";
import { TOOL_ABOUT, type ToolAbout } from "@/lib/tool-about";

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

/**
 * SPEC §5: Cleaver 01 and License Gate 02 lead; the other 8 follow A–Z by name (positions 1–10). Env Diff Snapshot was
 * retired on Oct 3 2026 (it kept pasted env text in localStorage), so it is no longer listed and the tools after it moved
 * up one: Hobby Deploy Burn Digest 9→8, LLM Feature-Cost Tag 10→9, What-Changed Card 11→10. Positions always match the row shown.
 */
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

/**
 * Tool story title + dek (COPY.md, LOCKED 7:40 PM ET Oct 2: Brand Creator + Voice Gate PASS). The title is also the
 * card title, so the title-<slug> morph pairs. Deploy Decision Card has no story (CEO 7:41 PM ET): a plain /apps row.
 */
export const TOOL_STORY: Record<string, { title: string; dek: string }> = {
  "stripe-cleaver": { title: "Get Stripe payouts into your books", dek: "Fees get their own rows, and the file never leaves your browser." },
  "license-gate": { title: "Catch license problems before release", dek: "Copyleft hits show up now, not when a release is on the clock." },
  "engrave-merge": { title: "Stop retyping Etsy names into LightBurn", dek: "Orders that need a look get flagged before you engrave." },
  "enterprise-scorecard": { title: "Is each part of the business on track?", dek: "Red, yellow, or green for each one, with the last result and date." },
  "llm-feature-cost-tag": { title: "Split the AI bill by feature", dek: "Paste your usage rows, and any feature at 40% or more gets flagged." },
  "what-changed-card": { title: "See what changed during an incident", dek: "Deploys, config, flags, and outside services, all on one card." },
  "hobby-deploy-burn-digest": { title: "Find what's eating your deploy quota", dek: "Paste your usage list and the busiest project goes to the top." },
  "agent-eval-go-no-go": { title: "Ship agents on a rule, not a hunch", dek: "Fill in the required checks, and the page says go or no-go." },
  "agent-bundle-tag": { title: "Know which version of an agent is live", dek: "Save each prompt and model setup, then compare any two." },
};

/** Story page path for a tool, or null when it has none (Deploy Decision Card: row body and Open both go to the tool). */
export function storyHref(id: string): string | null {
  return TOOL_STORY[id] ? `/apps/${id}` : null;
}

/** The tool's existing About text, reused verbatim as its story body (SPEC v2 §4). Engrave Merge: its apps.json entry. */
export function toolAbout(app: HubApp): ToolAbout | null {
  const a = TOOL_ABOUT[app.id];
  if (a) return a;
  if (app.pitch && app.what && app.why && app.how?.length) return { pitch: app.pitch, what: app.what, why: app.why, how: app.how };
  return null;
}

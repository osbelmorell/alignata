import type { HubApp } from "@/lib/types";
import { toolArt } from "@/lib/apps";

/**
 * App row (SPEC v2 §3/§4): icon, locked name + one-liner, and an Open pill straight to the tool.
 * - variant "card": soft Open (feed cards). "story": black Open, the page's one primary (tool story rows).
 * - The Open is a plain <a href> to the tool route, exactly like the v1.5 tool links QA passed on 75a11f3:
 *   it carries data-tool-slug / data-tool-pos (the tool's /apps position) so the site tracker adds ?dogfood=1 in a
 *   dogfood session and counts tool_open where it does today. It is never a click handler.
 */
export function AppRow({
  app,
  pos,
  variant = "card",
  row,
  homeTarget = false,
}: {
  app: HubApp;
  pos: number;
  variant?: "card" | "story";
  /** Story page: "first" (under the dek) or "end" (after the body). */
  row?: "first" | "end";
  /** Homepage: data-home-target="tool:<slug>" for home_click (same target as v1.5). */
  homeTarget?: boolean;
}) {
  const art = toolArt(app.id);
  return (
    <div className={`fx-app-row${variant === "story" ? " fx-story-row" : ""}`} {...(row ? { "data-row": row } : {})}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fx-icon" src={art.icon} alt={art.iconAlt} width={256} height={256} decoding="async" />
      <div className="fx-app-meta">
        <p className="fx-app-name">{app.name}</p>
        <p className="fx-app-line">{app.blurb}</p>
      </div>
      <OpenPill app={app} pos={pos} primary={variant === "story"} homeTarget={homeTarget} />
    </div>
  );
}

/** "Open", only ever "Open" (SPEC v2 §1 rule 5). Soft by default; `primary` = the black pill. */
export function OpenPill({
  app,
  pos,
  primary = false,
  homeTarget = false,
  tabIndex,
}: {
  app: HubApp;
  pos: number;
  primary?: boolean;
  homeTarget?: boolean;
  tabIndex?: number;
}) {
  return (
    <a
      className={`fx-open${primary ? " fx-primary" : ""}`}
      href={app.url}
      data-tool-slug={app.id}
      data-tool-pos={pos}
      {...(homeTarget ? { "data-home-target": `tool:${app.id}` } : {})}
      {...(tabIndex !== undefined ? { tabIndex } : {})}
      aria-label={`Open ${app.name}`}
    >
      Open
    </a>
  );
}

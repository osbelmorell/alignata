import Link from "next/link";
import type { HubApp } from "@/lib/types";
import type { ToolOpenSource } from "@/lib/site/events";
import { storyHref, toolArt } from "@/lib/apps";
import { Img } from "@/components/appstore/Img";

/**
 * App row (SPEC v2 §3/§4): icon, locked name + one-liner, and an Open pill straight to the tool.
 * - variant "card": soft Open (feed cards). "story": black Open, the page's one primary (tool story rows).
 * - Card variant: the name is a stretched link to the tool story (/apps/<slug>). On desktop the card title is
 *   already that link; on phone the restyle hides the title (compact row), so the name is the one that remains.
 *   Open stays a sibling link to the tool (no nested anchors). Tools with no story keep a plain name.
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
  secondary = false,
}: {
  app: HubApp;
  pos: number;
  /** Story end row: same row, soft Open, so the page keeps one primary (QA 679156c). */
  secondary?: boolean;
  variant?: "card" | "story";
  /** Story page: "first" (under the dek) or "end" (after the body). */
  row?: "first" | "end";
  /** Homepage: data-home-target="tool:<slug>" for home_click (same target as v1.5). */
  homeTarget?: boolean;
}) {
  const art = toolArt(app.id);
  const story = variant === "card" ? storyHref(app.id) : null;
  return (
    <div className={`fx-app-row${variant === "story" ? " fx-story-row" : ""}`} {...(row ? { "data-row": row } : {})}>
      <Img className="fx-icon" src={art.icon} alt={art.iconAlt} width={256} height={256} decoding="async" />
      <div className="fx-app-meta">
        <p className="fx-app-name">
          {story ? (
            <Link className="fx-stretch" href={story}>
              {app.name}
            </Link>
          ) : (
            app.name
          )}
        </p>
        <p className="fx-app-line">{app.blurb}</p>
      </div>
      <OpenPill app={app} pos={pos} primary={variant === "story" && !secondary} homeTarget={homeTarget} src={variant === "story" ? "story" : "feed"} />
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
  src,
  href,
}: {
  app: HubApp;
  pos: number;
  primary?: boolean;
  homeTarget?: boolean;
  tabIndex?: number;
  /** tool_open source tag: feed (homepage card), apps (/apps), story (in-page story row), sticky (sticky bar), guide. */
  src: ToolOpenSource;
  /** Override the tool URL (guides add ?ref=<guide>). */
  href?: string;
}) {
  return (
    <a
      className={`fx-open${primary ? " fx-primary" : ""}`}
      href={href ?? app.url}
      data-tool-slug={app.id}
      data-tool-pos={pos}
      data-tool-src={src}
      {...(homeTarget ? { "data-home-target": `tool:${app.id}` } : {})}
      {...(tabIndex !== undefined ? { tabIndex } : {})}
      aria-label={`Open ${app.name}`}
    >
      Open
    </a>
  );
}

/** A guide's closing app row: the black Open (the page's one primary) straight to the tool with the guide's ?ref=. */
export function GuideAppRow({ app, pos, href }: { app: HubApp; pos: number; href: string }) {
  const art = toolArt(app.id);
  return (
    <div className="fx-app-row fx-story-row" data-row="guide">
      <Img className="fx-icon" src={art.icon} alt={art.iconAlt} width={256} height={256} decoding="async" />
      <div className="fx-app-meta">
        <p className="fx-app-name">{app.name}</p>
        <p className="fx-app-line">{app.blurb}</p>
      </div>
      <OpenPill app={app} pos={pos} primary src="guide" href={href} />
    </div>
  );
}

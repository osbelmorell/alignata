import type { HubApp } from "@/lib/types";
import { toolArt } from "@/lib/apps";

const two = (n: number) => String(n).padStart(2, "0");

/**
 * The /apps card (SPEC §6): number, art, title, one line, black Open pill. Used on /apps and on the homepage (§5a).
 * Both links carry data-tool-slug / data-tool-pos (1-based, as shown) for the site tracker's tool_open; on the
 * homepage they also carry data-home-target="tool:<slug>" for home_click.
 */
export function ToolCard({ app, pos, homeTarget = false }: { app: HubApp; pos: number; homeTarget?: boolean }) {
  const art = toolArt(app.id);
  const external = !(app.url.startsWith("/") && !app.url.startsWith("//"));
  const linkProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const track = {
    "data-tool-slug": app.id,
    "data-tool-pos": pos,
    ...(homeTarget ? { "data-home-target": `tool:${app.id}` } : {}),
  };
  return (
    <article data-tool-card className={`fx-tool fx-card${art.featured ? " fx-lg" : ""}`}>
      <p className="fx-meta">
        {pos === 1 ? <span className="fx-dot" aria-hidden="true" /> : null}
        {two(pos)} /
      </p>
      <figure className="fx-art fx-reveal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/art/${art.file}-1280.webp`}
          srcSet={`/art/${art.file}-640.webp 640w, /art/${art.file}-1280.webp 1280w`}
          sizes={art.featured ? "(min-width: 1024px) 680px, (min-width: 900px) 570px, calc(100vw - 72px)" : "(min-width: 900px) 380px, calc(100vw - 72px)"}
          alt={art.alt}
          width={1280}
          height={720}
          {...(pos <= 2 ? { fetchPriority: pos === 1 ? ("high" as const) : ("auto" as const) } : { loading: "lazy" as const })}
          decoding="async"
        />
      </figure>
      <h2>
        <a className="fx-stretch" href={app.url} {...linkProps} {...track}>
          {app.name}
        </a>
      </h2>
      <p className="fx-line">{app.blurb}</p>
      <a className="fx-pill" href={app.url} {...linkProps} {...track} aria-label={`Open ${app.name}`}>
        Open
      </a>
    </article>
  );
}

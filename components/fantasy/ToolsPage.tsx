import type { HubApp } from "@/lib/types";
import { toolArt } from "@/lib/apps";
import { SiteFooter } from "@/components/fantasy/SiteFooter";

const two = (n: number) => String(n).padStart(2, "0");

/**
 * /apps (SPEC §6, frozen reference + Engrave Merge addendum): number, art, title, one line, black Open pill.
 * Both links carry data-tool-slug / data-tool-pos (1-based, as shown) for the site tracker's tool_open.
 */
export function ToolsPage({ apps }: { apps: HubApp[] }) {
  return (
    <div className="fx-page">
      <main className="fx-wrap">
        <section className="fx-page-head fx-tools-head">
          <h1 className="fx-display">Tools</h1>
          <p className="fx-intro">Small tools that each do one job. Tap one to start.</p>
        </section>
        <section className="fx-tools" aria-label="All tools">
          {apps.map((app, i) => {
            const pos = i + 1;
            const art = toolArt(app.id);
            const external = !(app.url.startsWith("/") && !app.url.startsWith("//"));
            const linkProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
            const track = { "data-tool-slug": app.id, "data-tool-pos": pos };
            return (
              <article key={app.id} data-tool-card className={`fx-tool fx-card${art.featured ? " fx-lg" : ""}`}>
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
                    {...(i < 2 ? { fetchPriority: i === 0 ? ("high" as const) : ("auto" as const) } : { loading: "lazy" as const })}
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
          })}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

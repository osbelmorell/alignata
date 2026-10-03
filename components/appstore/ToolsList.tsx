import Link from "next/link";
import type { HubApp } from "@/lib/types";
import { storyHref, toolArt } from "@/lib/apps";
import { OpenPill } from "@/components/appstore/AppRow";
import { SiteFooter } from "@/components/fantasy/SiteFooter";

/**
 * /apps (SPEC v2 §5): title, the locked subline, then all 11 tools as 88px app rows in /apps order (positions 1–11
 * unchanged). Row body → the tool's story (/apps/<slug>); the soft Open → the tool. Deploy Decision Card has no story
 * (CEO 7:40 PM ET Oct 2), so its row body and its Open both go straight to the tool (both counted as tool_open).
 */
export function ToolsList({ apps }: { apps: HubApp[] }) {
  return (
    <div className="fx-page">
      <main className="fx-wrap">
        <section className="fx-page-head fx-tools-head">
          <h1 className="fx-display">Tools</h1>
          <p className="fx-intro">Small tools that each do one job. Tap one to start.</p>
        </section>
        <ol className="fx-rows" aria-label="All tools">
          {apps.map((app, i) => {
            const pos = i + 1;
            const art = toolArt(app.id);
            const story = storyHref(app.id);
            return (
              <li key={app.id} className="fx-arow" data-slug={app.id} data-pos={pos}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="fx-icon" src={art.icon} alt={art.iconAlt} width={256} height={256} decoding="async" />
                <div className="fx-app-meta">
                  <p className="fx-app-name">
                    {story ? (
                      <Link className="fx-stretch" href={story}>
                        {app.name}
                      </Link>
                    ) : (
                      <a className="fx-stretch" href={app.url} data-tool-slug={app.id} data-tool-pos={pos}>
                        {app.name}
                      </a>
                    )}
                  </p>
                  <p className="fx-app-line">{app.blurb}</p>
                </div>
                <OpenPill app={app} pos={pos} />
              </li>
            );
          })}
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}

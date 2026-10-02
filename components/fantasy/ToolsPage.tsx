import type { HubApp } from "@/lib/types";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { ToolCard } from "@/components/fantasy/ToolCard";

/** /apps (SPEC §6, frozen reference + Engrave Merge addendum). */
export function ToolsPage({ apps }: { apps: HubApp[] }) {
  return (
    <div className="fx-page">
      <main className="fx-wrap">
        <section className="fx-page-head fx-tools-head">
          <h1 className="fx-display">Tools</h1>
          <p className="fx-intro">Small tools that each do one job. Tap one to start.</p>
        </section>
        <section className="fx-tools" aria-label="All tools">
          {apps.map((app, i) => (
            <ToolCard key={app.id} app={app} pos={i + 1} />
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

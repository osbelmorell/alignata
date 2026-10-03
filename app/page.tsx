import Link from "next/link";
import { getPostsNewestFirst } from "@/content/posts";
import { getApps, toolsOrder } from "@/lib/apps";
import { postTag } from "@/lib/daily-digest/meta";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { ArticleStoryCard, ToolStoryCard } from "@/components/appstore/StoryCard";
import { PageFade } from "@/components/appstore/Motion";
import { RetiredStorageCleanup } from "@/components/site/RetiredStorageCleanup";

/**
 * Homepage as the Today feed (SPEC v2 §2; mock mockups-art/home.html). Top unchanged from v1.5 §5a: the locked line and
 * two pills (black Tools = the one primary, outlined Daily Digest), no animation on first paint. Then five story cards,
 * no section headings: Cleaver, the newest article, License Gate, the next two articles. Then "All tools" and
 * "All articles". Deploy Decision Card never appears here. Tap targets for home_click are the same as v1.5.
 */
export default function HomePage() {
  const order = toolsOrder(getApps());
  const pos = (id: string) => order.findIndex((a) => a.id === id) + 1;
  const tool = (id: string) => order.find((a) => a.id === id);
  const [a1, a2, a3] = getPostsNewestFirst();
  const cleaver = tool("stripe-cleaver");
  const gate = tool("license-gate");
  const eyebrow = (p: NonNullable<typeof a1>) => `Daily Digest · ${postTag(p)}`;
  return (
    <PageFade>
      <div className="fx-page">
        <main className="fx-wrap">
          <section className="fx-home-head" aria-label="Start">
            <h1 className="fx-display">Small tools for busy people, and AI techniques in plain English.</h1>
            <div className="fx-home-cta">
              <Link className="fx-pill" href="/apps" data-home-target="tools-pill">
                Tools
              </Link>
              <Link className="fx-pill fx-pill-outline" href="/daily-digest" data-home-target="digest-pill">
                Daily Digest
              </Link>
            </div>
          </section>
          <section className="fx-feed" aria-label="Today">
            {cleaver ? <ToolStoryCard app={cleaver} pos={pos(cleaver.id)} lead homeTarget /> : null}
            {a1 ? <ArticleStoryCard post={a1} eyebrow={eyebrow(a1)} eager homeTarget /> : null}
            {gate ? <ToolStoryCard app={gate} pos={pos(gate.id)} homeTarget /> : null}
            {a2 ? <ArticleStoryCard post={a2} eyebrow={eyebrow(a2)} homeTarget /> : null}
            {a3 ? <ArticleStoryCard post={a3} eyebrow={eyebrow(a3)} homeTarget /> : null}
          </section>
          <nav className="fx-feed-links" aria-label="More">
            <Link className="fx-text-link" href="/apps" data-home-target="all-tools">
              All tools
            </Link>
            <Link className="fx-text-link" href="/daily-digest" data-home-target="all-articles">
              All articles
            </Link>
          </nav>
        </main>
        <SiteFooter />
        <RetiredStorageCleanup />
      </div>
    </PageFade>
  );
}

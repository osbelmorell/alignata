import Link from "next/link";
import { getPostsNewestFirst } from "@/content/posts";
import { getApps, toolsOrder } from "@/lib/apps";
import { PostCard } from "@/components/fantasy/PostCard";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { ToolCard } from "@/components/fantasy/ToolCard";

/**
 * Homepage (SPEC §5a, v1.5; reference alignata-mockups/site/home.html): one display line and two pills (no art,
 * no fade-in), then Tools (cards 01 + 02, "All tools"), then Daily Digest (3 newest, "All articles"), then the footer.
 * Every link carries data-home-target for the home_click tracker (targets as on main 63a78f8).
 */
export default function HomePage() {
  const tools = toolsOrder(getApps()).slice(0, 2);
  const posts = getPostsNewestFirst().slice(0, 3);
  return (
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
        <section className="fx-home-sec" aria-labelledby="h-tools">
          <h2 id="h-tools">Tools</h2>
          <div className="fx-tools">
            {tools.map((app, i) => (
              <ToolCard key={app.id} app={app} pos={i + 1} homeTarget />
            ))}
          </div>
          <Link className="fx-all-link" href="/apps" data-home-target="all-tools">
            All tools
          </Link>
        </section>
        <section className="fx-home-sec" aria-labelledby="h-digest">
          <h2 id="h-digest">Daily Digest</h2>
          <div className="fx-posts">
            {posts.map((post, i) => (
              <PostCard key={post.slug} post={post} feature={i === 0} homeTarget />
            ))}
          </div>
          <Link className="fx-all-link" href="/daily-digest" data-home-target="all-articles">
            All articles
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

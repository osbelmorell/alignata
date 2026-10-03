import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApps, TOOL_STORY, toolAbout, toolArt, toolsOrder } from "@/lib/apps";
import { ArtFigure } from "@/components/appstore/ArtFigure";
import { AppRow } from "@/components/appstore/AppRow";
import { StickyOpen } from "@/components/appstore/StickyOpen";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { Morph, PageFade } from "@/components/appstore/Motion";
import { GuidesLinks } from "@/components/guides/GuidesLinks";
import { getGuides } from "@/lib/guides/guides";

export const dynamicParams = false;

/** Tools with a story (all listed tools except Deploy Decision Card, CEO 7:40 PM ET Oct 2). Static, so next/link prefetches them in full. */
export function generateStaticParams() {
  return toolsOrder(getApps())
    .filter((a) => TOOL_STORY[a.id] && toolArt(a.id).art)
    .map((a) => ({ slug: a.id }));
}

function find(slug: string) {
  const order = toolsOrder(getApps());
  const i = order.findIndex((a) => a.id === slug);
  const app = order[i];
  const story = TOOL_STORY[slug];
  const art = app ? toolArt(app.id) : null;
  if (!app || !story || !art?.art) return null;
  return { app, pos: i + 1, story, art: { ...art, art: art.art } };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = find(slug);
  if (!t) return {};
  return {
    title: t.story.title,
    description: t.story.dek,
    alternates: { canonical: `/apps/${slug}` },
    openGraph: { type: "article", title: t.story.title, description: t.story.dek, url: `/apps/${slug}`, siteName: "Alignata" },
  };
}

/**
 * Tool story (SPEC v2 §4 + v2.3 calls 4a/5a; mock mockups-art/apps-stripe-cleaver.html). Hero directly under the header
 * (same file as the card), eyebrow "Tool", H1 = the card title, dek, then the app row with the page's one black Open.
 * Body = the tool's existing About text (lib/tool-about.ts). Ends with the app row again and "All tools".
 * No close (X): the header and the browser's back are the way out. The tool route stays the place the work happens.
 */
export default async function ToolStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = find(slug);
  if (!t) notFound();
  const { app, pos, story, art } = t;
  const about = toolAbout(app);
  return (
    <PageFade story>
      <div className="fx-page">
        <main className="fx-story">
          <article>
            <ArtFigure slug={app.id} className="fx-story-hero" src={art.art} alt={art.alt} pad={art.pad} hero />
            <div className="fx-story-col">
              <header className="fx-story-head">
                <p className="fx-eyebrow">Tool</p>
                <Morph name={`title-${app.id}`}>
                  <h1 className="fx-story-title">{story.title}</h1>
                </Morph>
                <p className="fx-story-dek">{story.dek}</p>
                <AppRow app={app} pos={pos} variant="story" row="first" />
              </header>
              {about ? (
                <div className="fx-prose fx-about">
                  <p className="fx-lead">{about.pitch}</p>
                  <h2>What</h2>
                  <p>{about.what}</p>
                  <h2>Why</h2>
                  <p>{about.why}</p>
                  <h2>How</h2>
                  <ol style={{ counterReset: "fx-ol 0" }}>
                    {about.how.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {/* Published guides for this tool (Engrave Merge today); renders nothing while none is published. */}
              <GuidesLinks tool={app.id} guides={getGuides()} />
              <div className="fx-story-end">
                <AppRow app={app} pos={pos} variant="story" row="end" />
                <Link className="fx-text-link" href="/apps">
                  All tools
                </Link>
              </div>
            </div>
          </article>
        </main>
        <SiteFooter />
        <div className="fx-sticky-space" aria-hidden="true" />
        <StickyOpen app={app} pos={pos} icon={art.icon} iconAlt={art.iconAlt} />
      </div>
    </PageFade>
  );
}

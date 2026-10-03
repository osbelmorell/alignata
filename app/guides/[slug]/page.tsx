import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApps, toolsOrder } from "@/lib/apps";
import { getGuide, getGuides, guideJsonLd, guideMetadata, guideToolHref, GUIDE_AUTHOR } from "@/lib/guides/guides";
import { jsonLdScript } from "@/lib/daily-digest/jsonld";
import { shortDate } from "@/lib/daily-digest/meta";
import { GuideBody } from "@/components/guides/GuideBody";
import { GuideAppRow } from "@/components/appstore/AppRow";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { PageFade } from "@/components/appstore/Motion";

export const dynamicParams = false;

/** Every guide renders, drafts included (QA sees the layout); drafts are noindex and linked nowhere. */
export function generateStaticParams() {
  return getGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  return g ? guideMetadata(g) : {};
}

/**
 * Guide (/guides/<slug>): the Daily Digest article story template in the 680 column, no hero. H1, dek, byline
 * "Alignata · Guide · <date>", the Markdown body, then ONE app row for the guide's tool whose black Open goes straight
 * to the tool with ?ref=<guide> (tool_open source "guide"). JSON-LD Article, author Organization "Alignata".
 */
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const order = toolsOrder(getApps());
  const i = order.findIndex((a) => a.id === g.tool);
  const app = order[i];
  return (
    <PageFade story>
      <div className="fx-page">
        <main className="fx-story fx-guide" data-guide={g.slug} {...(g.draft ? { "data-draft": "" } : {})}>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(guideJsonLd(g)) }} />
          <article>
            <div className="fx-story-col">
              <header className="fx-story-head">
                <h1 className="fx-story-title">{g.title}</h1>
                <p className="fx-story-dek">{g.dek}</p>
                <p className="fx-meta fx-story-meta">
                  <span>
                    {GUIDE_AUTHOR} · Guide · <time dateTime={g.datePublished}>{shortDate(g.datePublished)}</time>
                  </span>
                </p>
              </header>
              <GuideBody body={g.body} />
              {app ? (
                <div className="fx-story-end">
                  <GuideAppRow app={app} pos={i + 1} href={guideToolHref(app.url, g)} />
                </div>
              ) : null}
            </div>
          </article>
        </main>
        <SiteFooter />
      </div>
    </PageFade>
  );
}

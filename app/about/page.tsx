import Link from "next/link";
import { Fragment } from "react";
import type { Metadata } from "next";
import { ART_H, ART_W } from "@/lib/daily-digest/meta";
import { Img } from "@/components/appstore/Img";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { PageFade } from "@/components/appstore/Motion";
import { ABOUT } from "@/content/company";

export const metadata: Metadata = {
  title: "About",
  description: ABOUT.dek,
  alternates: { canonical: "/about" },
};

const PRIVACY_LINK_TEXT = "Privacy page";

/** One copy line; the words "Privacy page" become an underlined body link to /privacy (SPEC §2: body links are text). */
function Line({ text }: { text: string }) {
  const at = text.indexOf(PRIVACY_LINK_TEXT);
  if (at < 0) return <p>{text}</p>;
  return (
    <p>
      {text.slice(0, at)}
      <Link href="/privacy">{PRIVACY_LINK_TEXT}</Link>
      {text.slice(at + PRIVACY_LINK_TEXT.length)}
    </p>
  );
}

/**
 * /about (company pages SPEC §3, COPY.md §3): the article-story template in the 680 column. One sticker hero (v3 style,
 * its own colour), H1, the mission as the dek, the body, "Built by Osbel Morell.", then ONE black pill "See the tools"
 * → /apps. No team, story or values. No new events (page_view only).
 */
export default function AboutPage() {
  return (
    <PageFade story>
      <div className="fx-page">
        <main className="fx-story fx-company" data-page="about">
          <article>
            <figure className="fx-story-hero" style={{ "--art-pad": ABOUT.hero.pad } as React.CSSProperties} data-art="about">
              <Img src={ABOUT.hero.src} alt={ABOUT.hero.alt} width={ART_W} height={ART_H} fetchPriority="high" decoding="async" />
            </figure>
            <div className="fx-story-col">
              <header className="fx-story-head">
                <h1 className="fx-story-title">{ABOUT.title}</h1>
                <p className="fx-story-dek">{ABOUT.dek}</p>
              </header>
              <div className="fx-prose">
                {ABOUT.sections.map((s) => (
                  <Fragment key={s.h2}>
                    <h2>{s.h2}</h2>
                    {s.lines.map((l) => (
                      <Line key={l} text={l} />
                    ))}
                  </Fragment>
                ))}
                <p className="fx-built-by">{ABOUT.builtBy}</p>
              </div>
              <div className="fx-company-end">
                <Link className="fx-pill" href="/apps">
                  {ABOUT.pill}
                </Link>
              </div>
            </div>
          </article>
        </main>
        <SiteFooter />
      </div>
    </PageFade>
  );
}

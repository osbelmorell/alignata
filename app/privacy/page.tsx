import { Fragment } from "react";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { PageFade } from "@/components/appstore/Motion";
import { PRIVACY, SHIP_DATE, shipDateLabel } from "@/content/company";

export const metadata: Metadata = {
  title: "Privacy",
  description: PRIVACY.dek,
  alternates: { canonical: "/privacy" },
};

/**
 * /privacy (company pages SPEC §5, COPY.md §5 v4 FINAL): no art. H1, dek, "Last updated <SHIP_DATE>", "The short version"
 * (3 plain bullets), then the full text under plain H2s, in the 680 story column. No pill, no new events.
 * A plain-English draft, not legal advice (a lawyer reviews it before payments go live).
 */
export default function PrivacyPage() {
  return (
    <PageFade story>
      <div className="fx-page">
        <main className="fx-story fx-company" data-page="privacy">
          <article>
            <div className="fx-story-col">
              <header className="fx-story-head">
                <h1 className="fx-story-title">{PRIVACY.title}</h1>
                <p className="fx-story-dek">{PRIVACY.dek}</p>
                <p className="fx-meta fx-story-meta">
                  {PRIVACY.updatedPrefix} <time dateTime={SHIP_DATE}>{shipDateLabel()}</time>
                </p>
              </header>
              <div className="fx-prose">
                <h2>The short version</h2>
                <ul>
                  {PRIVACY.short.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                {PRIVACY.sections.map((s) => (
                  <Fragment key={s.h2}>
                    <h2>{s.h2}</h2>
                    {s.paras.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>
          </article>
        </main>
        <SiteFooter />
      </div>
    </PageFade>
  );
}

import Link from "next/link";
import type { Post } from "@/content/posts";
import type { HubApp } from "@/lib/types";
import { TOOL_STORY, toolArt } from "@/lib/apps";
import { cardImage, postCardDek, postTag, shortDate } from "@/lib/daily-digest/meta";
import { AppRow } from "@/components/appstore/AppRow";
import { ArtFigure } from "@/components/appstore/ArtFigure";
import { Morph } from "@/components/appstore/Motion";

/**
 * Story card (SPEC v2 §3): one rounded white card. Art full-bleed on top (4:3 phone, 16:9 desktop, never cropped),
 * then eyebrow, title and dek on the card surface (never on the art). The title is the link to the story, stretched
 * over the card with ::after; a tool card's Open is a separate sibling link above it (no nested anchors).
 */
export function ToolStoryCard({ app, pos, lead = false, homeTarget = false }: { app: HubApp; pos: number; lead?: boolean; homeTarget?: boolean }) {
  const art = toolArt(app.id);
  const story = TOOL_STORY[app.id];
  if (!story || !art.art) return null;
  return (
    <article className={`fx-scard${lead ? " fx-lead" : ""}`} data-kind="tool" data-slug={app.id}>
      <ArtFigure slug={app.id} className="fx-scard-art" src={art.art} alt={art.alt} pad={art.pad} eager={lead} />
      <div className="fx-scard-text">
        <p className="fx-eyebrow">Tool</p>
        <Morph name={`title-${app.id}`}>
          <h2 className="fx-scard-title">
            <Link className="fx-stretch" href={`/apps/${app.id}`}>
              {story.title}
            </Link>
          </h2>
        </Morph>
        <p className="fx-scard-dek">{story.dek}</p>
      </div>
      <AppRow app={app} pos={pos} homeTarget={homeTarget} />
    </article>
  );
}

export function ArticleStoryCard({
  post,
  eyebrow,
  heading: H = "h2",
  lead = false,
  eager = false,
  homeTarget = false,
}: {
  post: Post;
  /** Default: the tag ("Technique" / "Deep dive" / "Essay"), as on /daily-digest. The feed passes "Daily Digest · <tag>". */
  eyebrow?: string;
  heading?: "h2" | "h3";
  lead?: boolean;
  eager?: boolean;
  /** Homepage only: data-home-target="article:<slug>" for home_click. */
  homeTarget?: boolean;
}) {
  const art = cardImage(post);
  return (
    <article className={`fx-scard${lead ? " fx-lead" : ""}`} data-kind="article" data-post-card={post.slug}>
      <ArtFigure slug={post.slug} className="fx-scard-art" src={art.src} alt={art.alt} pad={art.pad} eager={eager} />
      <div className="fx-scard-text">
        <p className="fx-eyebrow">{eyebrow ?? postTag(post)}</p>
        <Morph name={`title-${post.slug}`}>
          <H className="fx-scard-title">
            <Link
              className="fx-stretch"
              href={`/daily-digest/${post.slug}`}
              {...(homeTarget ? { "data-home-target": `article:${post.slug}` } : {})}
            >
              {post.title}
            </Link>
          </H>
        </Morph>
        <p className="fx-scard-dek">{postCardDek(post)}</p>
        <p className="fx-meta fx-scard-date">
          <time dateTime={post.date}>{shortDate(post.date)}</time>
        </p>
      </div>
    </article>
  );
}

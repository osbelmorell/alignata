import Link from "next/link";
import type { Post } from "@/content/posts";
import { postCardDek, postHero, postMeta } from "@/lib/daily-digest/meta";

/**
 * Daily Digest card (SPEC §7, frozen reference daily-digest.html): art 16:9, meta (tag · date · read time),
 * title, one-line dek. No Open pill: the title is the link and its ::after covers the whole card (48px+ tap area).
 * Card art is decorative (alt=""), because the title next to it names the card; the article hero carries the alt.
 */
export function PostCard({
  post,
  feature = false,
  dot = false,
  heading: H = "h2",
  eager = false,
  homeTarget = false,
}: {
  post: Post;
  feature?: boolean;
  dot?: boolean;
  heading?: "h2" | "h3";
  eager?: boolean;
  /** Homepage only: data-home-target="article:<slug>" for home_click. */
  homeTarget?: boolean;
}) {
  const art = postHero(post);
  return (
    <article className={`fx-post fx-card${feature ? " fx-feature" : ""}`} data-post-card={post.slug}>
      <figure className="fx-art fx-reveal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/art/${art.image}-1280.webp`}
          srcSet={`/art/${art.image}-640.webp 640w, /art/${art.image}-1280.webp 1280w`}
          sizes={feature ? "(min-width: 900px) 690px, calc(100vw - 40px)" : "(min-width: 900px) 380px, calc(100vw - 40px)"}
          alt=""
          width={1280}
          height={720}
          {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
          decoding="async"
        />
      </figure>
      <div className="fx-txt">
        <p className="fx-meta">
          {dot ? <span className="fx-dot" aria-hidden="true" /> : null}
          {postMeta(post)}
        </p>
        <H>
          <Link
            className="fx-stretch"
            href={`/daily-digest/${post.slug}`}
            {...(homeTarget ? { "data-home-target": `article:${post.slug}` } : {})}
          >
            {post.title}
          </Link>
        </H>
        <p className="fx-dek">{postCardDek(post)}</p>
      </div>
    </article>
  );
}

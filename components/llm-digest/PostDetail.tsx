import Link from "next/link";
import { ShareUrlButton } from "@/components/llm-digest/ShareUrlButton";
import { renderDigestMarkdown } from "@/lib/llm-digest/markdown";
import type { DigestPost, DigestTechnique } from "@/lib/llm-digest/types";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** When structured techniques exist, drop the duplicate ## Techniques section from markdown. */
function markdownWithoutTechniques(md: string, hasTechniques: boolean) {
  if (!hasTechniques) return md;
  const match = md.search(/^## Techniques\s*$/m);
  if (match < 0) return md;
  return md.slice(0, match).trimEnd() + "\n";
}

function sortTechniques(list: DigestTechnique[]) {
  return [...list].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

function RankBadge({ rank }: { rank?: 1 | 2 | 3 }) {
  if (!rank) return null;
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
      <span
        className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-1.5 text-xs font-semibold tabular-nums text-[var(--cb-ink)]"
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>
      {rank === 1 ? (
        <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[var(--cb-radius-pill)] bg-[var(--cb-lime)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cb-lime-ink)]">
          Try first
        </span>
      ) : null}
    </span>
  );
}

function ResultBadge({ result }: { result?: DigestTechnique["result"] }) {
  if (!result) return null;
  const styles =
    result === "WORKS"
      ? "border-[var(--cb-olive)] bg-[color-mix(in_srgb,var(--cb-olive)_12%,white)] text-[var(--cb-olive-deep)]"
      : result === "MIXED"
        ? "border-[var(--cb-clay-deep)] bg-[color-mix(in_srgb,var(--cb-clay)_22%,white)] text-[var(--cb-olive-deep)]"
        : "border-[var(--cb-danger)] bg-[color-mix(in_srgb,var(--cb-danger)_12%,white)] text-[var(--cb-danger)]";
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-[var(--cb-radius-pill)] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}
    >
      {result}
    </span>
  );
}

function TechniqueCard({ technique }: { technique: DigestTechnique }) {
  const how = technique.howTested?.trim();
  const outcome = technique.outcome?.trim();
  return (
    <li className="min-w-0 max-w-full overflow-hidden rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] p-4 shadow-[var(--cb-shadow)] sm:rounded-[var(--cb-radius-squircle)] sm:p-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <RankBadge rank={technique.rank} />
        <h3 className="min-w-0 break-words text-base font-semibold text-[var(--cb-ink)] [overflow-wrap:anywhere]">
          {technique.title}
        </h3>
        <ResultBadge result={technique.result} />
      </div>
      {outcome ? (
        <p className="mt-1 break-words text-sm text-[var(--cb-olive)] [overflow-wrap:anywhere]">
          {outcome}
        </p>
      ) : null}
      <p className="mt-2 break-words text-sm leading-relaxed text-[var(--cb-ink-muted)] [overflow-wrap:anywhere]">
        {technique.whatWhy}
      </p>
      {how ? (
        <details className="group mt-3 min-w-0 overflow-hidden rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-transparent">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-[var(--cb-ink-muted)] marker:content-none [&::-webkit-details-marker]:hidden hover:text-[var(--cb-ink)]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="text-[var(--cb-ink-muted)] transition group-open:rotate-90">
                ▸
              </span>
              How it was tested
            </span>
          </summary>
          <p className="break-words border-t border-[var(--cb-line)] px-3 py-3 text-sm leading-relaxed text-[var(--cb-ink-muted)] [overflow-wrap:anywhere]">
            {how}
          </p>
        </details>
      ) : null}
    </li>
  );
}

export function PostDetail({ post }: { post: DigestPost }) {
  const techniques = sortTechniques(
    post.techniques?.filter((t) => t?.title && t?.whatWhy) ?? [],
  );
  const body = markdownWithoutTechniques(
    post.bodyMarkdown,
    techniques.length > 0,
  );

  return (
    <article className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 py-6 sm:px-6 sm:py-10">
      <p className="mb-4">
        <Link
          href="/llm-digest"
          className="text-xs font-medium text-[var(--cb-ink-muted)] hover:text-[var(--cb-ink)]"
        >
          ← All digests
        </Link>
      </p>
      <header className="min-w-0 space-y-3 overflow-x-hidden border-b border-[var(--cb-line)] pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cb-ink-muted)]">
          AI Digest
        </p>
        <h1 className="break-words text-2xl font-semibold tracking-tight text-[var(--cb-ink)] [overflow-wrap:anywhere] sm:text-3xl">
          {post.title}
        </h1>
        <time
          dateTime={post.publishedAt}
          className="block text-sm text-[var(--cb-ink-muted)]"
        >
          {formatWhen(post.publishedAt)}
        </time>
        <div className="pt-1">
          <ShareUrlButton path={`/llm-digest/${post.slug}`} />
        </div>
        {post.tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex max-w-full items-center whitespace-nowrap rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--cb-ink-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="break-words text-sm leading-relaxed text-[var(--cb-ink-muted)] [overflow-wrap:anywhere]">
          {post.summary}
        </p>
      </header>

      {body.trim() ? (
        <div className="mt-6 max-w-full min-w-0 overflow-x-hidden break-words [overflow-wrap:anywhere]">
          {renderDigestMarkdown(body)}
        </div>
      ) : null}

      {techniques.length ? (
        <section className="mt-10 min-w-0 overflow-x-hidden border-t border-[var(--cb-line)] pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
            Techniques
          </h2>
          <ul className="mt-4 space-y-3">
            {techniques.map((t) => (
              <TechniqueCard key={t.id ?? t.title} technique={t} />
            ))}
          </ul>
        </section>
      ) : null}

      {post.sources.length ? (
        <section className="mt-10 min-w-0 overflow-x-hidden border-t border-[var(--cb-line)] pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
            Sources
          </h2>
          <ul className="mt-3 max-w-full space-y-2 text-sm">
            {post.sources.map((s) => (
              <li key={s.url + s.label} className="min-w-0 max-w-full">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-[var(--cb-olive-deep)] [overflow-wrap:anywhere] hover:text-[var(--cb-ink)]"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {post.links.length ? (
        <section className="mt-8 min-w-0 overflow-x-hidden border-t border-[var(--cb-line)] pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
            Links
          </h2>
          <ul className="mt-3 max-w-full space-y-2 text-sm">
            {post.links.map((s) => (
              <li key={s.url + s.label} className="min-w-0 max-w-full">
                <a
                  href={s.url}
                  className="break-all text-[var(--cb-olive-deep)] [overflow-wrap:anywhere] hover:text-[var(--cb-ink)]"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AboutPanel } from "@/components/llm-digest/AboutPanel";
import type { DigestPost, DigestTechnique } from "@/lib/llm-digest/types";

const PAGE = 2;

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function sortTechniques(list: DigestTechnique[]) {
  return [...list].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

function matches(post: DigestPost, q: string) {
  if (!q) return true;
  const techniqueText = (post.techniques ?? [])
    .flatMap((t) => [
      t.title,
      t.teaser ?? "",
      t.outcome ?? "",
      t.whatWhy,
      t.howTested ?? "",
      t.result ?? "",
      t.rank != null ? String(t.rank) : "",
    ])
    .join(" ");
  const hay = [
    post.title,
    post.summary,
    post.bodyMarkdown,
    post.tags.join(" "),
    techniqueText,
    ...post.sources.map((s) => s.label),
  ]
    .join("\n")
    .toLowerCase();
  return hay.includes(q);
}

export function DigestFeed({ posts }: { posts: DigestPost[] }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => matches(p, q));
  }, [posts, query]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <div className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 py-6 sm:px-6 sm:py-10">
      <header className="mb-4 min-w-0 space-y-2 sm:mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cb-ink-muted)]">
          Build · Eng Ops
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cb-ink)] sm:text-3xl">
          AI Digest
        </h1>
        <p className="max-w-2xl break-words text-sm leading-relaxed text-[var(--cb-ink-muted)] [overflow-wrap:anywhere]">
          Weekday board feed: news FYI + box-tested harness techniques. Newest
          first. Auth off. Posts are static JSON in-repo.
        </p>
      </header>

      <AboutPanel />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="block w-full max-w-md">
          <span className="sr-only">Search digests</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE);
            }}
            placeholder="Search title, tags, body…"
            className="w-full rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-4 py-2.5 text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]"
          />
        </label>
        <p className="text-xs text-[var(--cb-ink-muted)]">
          {filtered.length} post{filtered.length === 1 ? "" : "s"}
          {query.trim() ? " matching" : ""}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[var(--cb-radius-card-sm)] border border-dashed border-[var(--cb-line)] bg-[var(--cb-surface)] px-4 py-10 text-center text-sm text-[var(--cb-ink-muted)] shadow-[var(--cb-shadow)]">
          No digests match “{query.trim()}”.
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((post) => {
            const ranked = sortTechniques(post.techniques ?? []).filter(
              (t) => t.title,
            );
            return (
              <li key={post.slug} className="min-w-0 max-w-full">
                <Link
                  href={`/llm-digest/${post.slug}`}
                  className="block min-w-0 max-w-full overflow-hidden rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] p-4 shadow-[var(--cb-shadow)] transition hover:border-[color-mix(in_srgb,var(--cb-ink)_18%,var(--cb-line))] sm:rounded-[var(--cb-radius-squircle)] sm:p-5"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                    <h2 className="min-w-0 break-words text-base font-semibold text-[var(--cb-ink)] [overflow-wrap:anywhere]">
                      {post.title}
                    </h2>
                    <time
                      dateTime={post.publishedAt}
                      className="shrink-0 text-xs text-[var(--cb-ink-muted)]"
                    >
                      {formatWhen(post.publishedAt)}
                    </time>
                  </div>
                  <p className="mt-2 break-words text-sm leading-relaxed text-[var(--cb-ink-muted)] [overflow-wrap:anywhere]">
                    {post.summary}
                  </p>
                  {ranked.length ? (
                    <ul className="mt-3 space-y-2 border-t border-[var(--cb-line)] pt-3">
                      {ranked.map((t) => (
                        <li
                          key={t.id ?? t.title}
                          className="flex min-w-0 items-start gap-2 text-sm leading-relaxed text-[var(--cb-ink)]"
                        >
                          {t.rank ? (
                            <span
                              className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-1 text-[10px] font-semibold tabular-nums text-[var(--cb-ink)]"
                              aria-label={`Rank ${t.rank}`}
                            >
                              {t.rank}
                            </span>
                          ) : (
                            <span className="mt-0.5 text-[var(--cb-ink-muted)]">
                              ·
                            </span>
                          )}
                          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                            <span className="font-medium text-[var(--cb-ink)]">
                              {t.title}
                            </span>
                            {t.rank === 1 ? (
                              <span className="ml-2 inline-flex shrink-0 items-center whitespace-nowrap rounded-[var(--cb-radius-pill)] bg-[var(--cb-lime)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--cb-lime-ink)] align-middle">
                                Try first
                              </span>
                            ) : null}
                            {t.result ? (
                              <span className="ml-2 inline-flex whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-[var(--cb-ink-muted)] align-middle">
                                {t.result}
                              </span>
                            ) : null}
                            {t.teaser?.trim() ? (
                              <span className="mt-0.5 block break-words text-[var(--cb-ink-muted)] [overflow-wrap:anywhere]">
                                {t.teaser.trim()}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {post.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex max-w-full items-center whitespace-nowrap rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--cb-ink-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((n) => n + PAGE)}
            className="rounded-[var(--cb-radius-pill)] bg-[var(--cb-ink)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Load more ({filtered.length - visible} left)
          </button>
        </div>
      ) : null}
    </div>
  );
}

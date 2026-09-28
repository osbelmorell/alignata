"use client";

import { useMemo, useState } from "react";
import { AboutPanel } from "@/components/AboutPanel";
import type { HubApp } from "@/lib/types";
import { sortApps } from "@/lib/apps";

function isHubRelative(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}

function AppCard({ app }: { app: HubApp }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const hasDetail = Boolean(
    app.pitch || app.what || app.why || (app.how && app.how.length),
  );
  const hubRelative = isHubRelative(app.url);
  // Plain purpose line on the card face — do not change apps.json blurbs.
  const purpose = app.blurb;
  const linkProps = hubRelative
    ? {}
    : { target: "_blank" as const, rel: "noopener noreferrer" };

  return (
    <li
      className="relative flex h-full flex-col overflow-hidden rounded-[var(--cb-radius-squircle)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] transition hover:border-[color-mix(in_srgb,var(--cb-ink)_12%,var(--cb-line))]"
    >
      {/* Whole-card tap target (UX Lead: card opens the app) */}
      <a
        href={app.url}
        {...linkProps}
        aria-label={`Open ${app.name}`}
        className="absolute inset-0 z-0 rounded-[var(--cb-radius-squircle)]"
      />

      {/* Content is pointer-events-none so the inset link receives taps;
          About + Open re-enable pointer-events. */}
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-5 pt-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-[20px] font-semibold leading-snug tracking-tight text-[var(--cb-ink)] sm:text-[22px]">
            {app.name}
          </h2>
          <p className="text-[15px] leading-relaxed text-[var(--cb-ink-muted)] sm:text-base">
            {purpose}
          </p>
        </div>

        {hasDetail ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAboutOpen((v) => !v);
              }}
              aria-expanded={aboutOpen}
              className="pointer-events-auto relative z-20 rounded-md px-1 py-1 text-sm font-medium text-[var(--cb-ink-muted)] underline-offset-2 hover:text-[var(--cb-ink)] hover:underline"
            >
              {aboutOpen ? "Hide About" : "About"}
            </button>
            {aboutOpen ? (
              <div
                className="pointer-events-auto relative z-20 mt-3 space-y-3 border-t border-[var(--cb-line)] pt-3 text-sm leading-relaxed text-[var(--cb-ink-muted)]"
                onClick={(e) => e.stopPropagation()}
              >
                {app.pitch ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
                      Overview
                    </p>
                    <p className="mt-1 text-[var(--cb-ink)]">{app.pitch}</p>
                  </div>
                ) : null}
                {app.what ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
                      What
                    </p>
                    <p className="mt-1 text-[var(--cb-ink)]">{app.what}</p>
                  </div>
                ) : null}
                {app.why ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
                      Why
                    </p>
                    <p className="mt-1 text-[var(--cb-ink)]">{app.why}</p>
                  </div>
                ) : null}
                {app.how && app.how.length ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
                      How
                    </p>
                    <ol className="mt-1 list-decimal space-y-1 pl-4 text-[var(--cb-ink)]">
                      {app.how.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Primary Open: full-width black pill only (circle ↗ dropped) */}
        <a
          href={app.url}
          {...linkProps}
          className="cb-open-pill pointer-events-auto relative z-20 mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--cb-radius-pill)] bg-[var(--cb-ink)] px-4 py-3.5 text-base font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-ink)] sm:py-3 sm:text-sm"
        >
          {hubRelative ? "Open" : "Open ↗"}
        </a>
      </div>
    </li>
  );
}

export function AppHub({ apps }: { apps: HubApp[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? apps.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.blurb.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q) ||
            (a.pitch && a.pitch.toLowerCase().includes(q)) ||
            (a.what && a.what.toLowerCase().includes(q)),
        )
      : apps;
    return sortApps(base);
  }, [apps, query]);

  const liveCount = useMemo(
    () => apps.filter((a) => a.status === "live").length,
    [apps],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--cb-ink-muted)]">
          Build · Enterprise
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--cb-ink)] sm:text-4xl">
          Enterprise App Hub
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--cb-ink-muted)]">
          Base launcher for all Build apps. Tap a card or Open to launch — use{" "}
          <span className="text-[var(--cb-ink)]">Hub / All apps</span> on a tool
          page to return here.
        </p>
      </header>

      <AboutPanel />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Search apps</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-4 py-3 text-base text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_15%,transparent)] sm:py-2.5 sm:text-sm"
          />
        </label>
        {/* Board: one obvious lime live count — kill “N of N · live first • N live” */}
        {liveCount > 0 ? (
          <p
            className="inline-flex items-center gap-2 self-start rounded-[var(--cb-radius-pill)] bg-[var(--cb-lime)] px-3.5 py-1.5 text-base font-semibold text-[var(--cb-lime-ink)] sm:self-auto"
            aria-label={`${liveCount} live apps`}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--cb-lime-ink)]"
            />
            {liveCount} live
          </p>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-[var(--cb-radius-card-sm)] border border-dashed border-[var(--cb-line)] bg-[var(--cb-surface)] px-4 py-10 text-center text-base text-[var(--cb-ink-muted)] sm:text-sm">
          No apps match “{query.trim()}”.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </ul>
      )}

      <footer className="border-t border-[var(--cb-line)] pt-6 text-xs text-[var(--cb-ink-muted)]">
        Private hub · not indexed · data from{" "}
        <code className="text-[var(--cb-ink)]">public/apps.json</code>
      </footer>
    </main>
  );
}

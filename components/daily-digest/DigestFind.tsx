"use client";

import { useLayoutEffect, useState } from "react";
import { DIGEST_TYPES, digestFilterCss, parseDigestType, postMatches, type DigestTypeId } from "@/lib/daily-digest/listing";

const STYLE_ID = "dd-find-style";

function readQuery(): { type: DigestTypeId; q: string } {
  const params = new URLSearchParams(window.location.search);
  return { type: parseDigestType(params.get("type")), q: params.get("q") ?? "" };
}

/** Shareable query (`?type=deep-dive&q=`) without a navigation. Canonical is set in page metadata, not here. */
function writeQuery(type: DigestTypeId, q: string) {
  const url = new URL(window.location.href);
  if (type === "all") url.searchParams.delete("type");
  else url.searchParams.set("type", type);
  const query = q.trim();
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  const next = url.pathname + url.search + url.hash;
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (next !== current) window.history.replaceState(null, "", next);
}

function applyFilter(type: DigestTypeId, q: string) {
  const css = digestFilterCss(type, q);
  let style = document.getElementById(STYLE_ID);
  if (!css) {
    style?.remove();
  } else {
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }
  const root = document.querySelector(".fx-digest-latest");
  let any = false;
  root?.querySelectorAll<HTMLElement>("[data-digest-month]").forEach((month) => {
    const shown = [...month.querySelectorAll<HTMLElement>("[data-search]")].some((card) =>
      postMatches({ tag: card.getAttribute("data-tag") ?? "", search: card.getAttribute("data-search") ?? "" }, type, q),
    );
    if (shown) any = true;
  });
  const empty = document.getElementById("digest-empty");
  if (empty) empty.hidden = any;
}

/**
 * Type chips + search for the Latest feed. The feed itself stays server-rendered; this only
 * writes a stylesheet and the URL. Runs before paint so a shared `?type=&q=` link does not flash
 * the unfiltered list. Month headers are not sticky.
 */
export function DigestFind() {
  const [type, setType] = useState<DigestTypeId>("all");
  const [q, setQ] = useState("");

  useLayoutEffect(() => {
    const sync = () => {
      const next = readQuery();
      setType(next.type);
      setQ(next.q);
      applyFilter(next.type, next.q);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  function select(next: DigestTypeId) {
    setType(next);
    writeQuery(next, q);
    applyFilter(next, q);
  }

  function onSearch(value: string) {
    setQ(value);
    writeQuery(type, value);
    applyFilter(type, value);
  }

  return (
    <div className="fx-digest-find" role="search">
      <div className="fx-digest-chips" role="group" aria-label="Article type">
        {DIGEST_TYPES.map((item) => (
          <button key={item.id} type="button" aria-pressed={type === item.id} onClick={() => select(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <input
        className="fx-digest-q"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        aria-label="Search titles and deks"
        placeholder="Search"
        value={q}
        autoComplete="off"
        onChange={(event) => onSearch(event.target.value)}
      />
    </div>
  );
}

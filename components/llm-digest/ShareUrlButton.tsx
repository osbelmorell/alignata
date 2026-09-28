"use client";

import { useState } from "react";

export function ShareUrlButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-3 py-1.5 text-xs font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-line)]"
    >
      {copied ? "Copied" : "Copy share URL"}
    </button>
  );
}

import type { WhatChangedCard } from "./types";

function fmtTs(iso: string) {
  try {
    return new Date(iso).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
  } catch {
    return iso;
  }
}

export function cardToMarkdown(card: WhatChangedCard): string {
  const lines: string[] = [];
  lines.push(`# What Changed — \`${card.service}\``);
  lines.push("");
  lines.push(`- **Window:** ${card.windowLabel}`);
  lines.push(`- **From → To:** ${fmtTs(card.from)} → ${fmtTs(card.to)}`);
  lines.push(`- **Generated:** ${fmtTs(card.generatedAt)}`);
  lines.push(`- **Events:** ${card.eventCount}`);
  lines.push("");
  lines.push(`## Decision: ${card.decision.verdict.toUpperCase()}`);
  lines.push("");
  lines.push(card.decision.summary);
  if (card.decision.checks.length) {
    lines.push("");
    lines.push("**What to verify**");
    for (const c of card.decision.checks) lines.push(`- ${c}`);
  }
  lines.push("");
  lines.push("## Deploys");
  if (!card.deploys.length) lines.push("_None_");
  else {
    for (const d of card.deploys) {
      lines.push(
        `- \`${d.version || "?"}\` (${d.sha || "—"}) · ${d.env || "?"} · ${d.by || "?"} · ${fmtTs(d.ts)}`,
      );
    }
  }
  lines.push("");
  lines.push("## Config changes");
  if (!card.config.length) lines.push("_None_");
  else {
    for (const c of card.config) {
      lines.push(
        `- \`${c.key}\`: \`${c.oldValue ?? "?"}\` → \`${c.newValue ?? "?"}\` · ${fmtTs(c.ts)}`,
      );
    }
  }
  lines.push("");
  lines.push("## Feature flags");
  if (!card.flags.length) lines.push("_None_");
  else {
    for (const f of card.flags) {
      lines.push(
        `- \`${f.flag}\`: ${f.fromState ?? "?"} → ${f.toState ?? "?"} · ${fmtTs(f.ts)}`,
      );
    }
  }
  lines.push("");
  lines.push("## Upstreams");
  if (!card.upstreams.length) lines.push("_None_");
  else {
    for (const u of card.upstreams) {
      lines.push(
        `- \`${u.dependency}\`: ${u.status || "?"} ${u.depVersion ? `(${u.depVersion})` : ""} ${u.note ? `— ${u.note}` : ""} · ${fmtTs(u.ts)}`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function cardToJson(card: WhatChangedCard): string {
  return JSON.stringify(card, null, 2);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

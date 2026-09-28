import { sanitizeSnapshotForExport } from "./diff";
import type { DiffCategory, EnvDiffSnapshot } from "./types";

const CATEGORY_TITLE: Record<DiffCategory, string> = {
  missing: "Missing in after (only in before)",
  extra: "Extra in after (new keys)",
  changed: "Changed values",
  unchanged: "Unchanged",
};

function fmtTs(iso: string) {
  try {
    return new Date(iso)
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "Z");
  } catch {
    return iso;
  }
}

function tableFor(rows: EnvDiffSnapshot["rows"]): string[] {
  const lines: string[] = [];
  if (!rows.length) {
    lines.push("_None_");
    return lines;
  }
  lines.push("| Key | Before (redacted) | After (redacted) |");
  lines.push("| --- | --- | --- |");
  for (const r of rows) {
    const flag = r.secretLike ? " 🔒" : "";
    lines.push(
      `| \`${r.key}\`${flag} | \`${r.beforeMasked}\` | \`${r.afterMasked}\` |`,
    );
  }
  return lines;
}

export function snapshotToMarkdown(snap: EnvDiffSnapshot): string {
  const safe = sanitizeSnapshotForExport(snap);
  const lines: string[] = [];
  lines.push(
    `# Env Diff Snapshot — \`${safe.beforeLabel}\` → \`${safe.afterLabel}\``,
  );
  lines.push("");
  lines.push(`- **Generated:** ${fmtTs(safe.generatedAt)}`);
  lines.push(
    `- **Counts:** missing ${safe.counts.missing} · extra ${safe.counts.extra} · changed ${safe.counts.changed} · unchanged ${safe.counts.unchanged} · secret-like ${safe.counts.secretLike} (${safe.counts.total} keys)`,
  );
  lines.push(`- **Summary:** ${safe.summaryLine}`);
  lines.push("");

  lines.push("## Secret-like keys");
  lines.push(
    "_Flagged by key name (SECRET/TOKEN/PASSWORD/…) or value shape; values always redacted._",
  );
  lines.push("");
  lines.push(...tableFor(safe.rows.filter((r) => r.secretLike)));
  lines.push("");

  for (const cat of [
    "missing",
    "extra",
    "changed",
    "unchanged",
  ] as DiffCategory[]) {
    const rows = safe.rows.filter((r) => r.category === cat);
    lines.push(`## ${CATEGORY_TITLE[cat]}`);
    lines.push(...tableFor(rows));
    lines.push("");
  }

  lines.push(
    "_Client-side only. Raw secrets are never logged or exported — paste key lists safely._",
  );
  lines.push("");
  return lines.join("\n");
}

export function snapshotToJson(snap: EnvDiffSnapshot): string {
  return JSON.stringify(sanitizeSnapshotForExport(snap), null, 2);
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

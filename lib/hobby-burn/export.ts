import type { Digest } from "./types";

export function digestToMarkdown(d: Digest): string {
  const lines = [
    `# ${d.label}`,
    "",
    d.oneLiner,
    "",
    `| Project | Deploys | Share | GB-hours |`,
    `| --- | ---: | ---: | ---: |`,
    ...d.rows.map(
      (r) =>
        `| ${r.project}${r.isTop ? " ★" : ""} | ${r.deploys} | ${(r.share * 100).toFixed(0)}% | ${r.gbHours ? r.gbHours.toFixed(1) : "—"} |`,
    ),
    "",
    `_Total: ${d.totalDeploys} deploys · ${d.totalGbHours.toFixed(1)} GB-hours · ${d.createdAt.slice(0, 10)}_`,
  ];
  return lines.join("\n");
}

export function digestToJson(d: Digest): string {
  return JSON.stringify(d, null, 2);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

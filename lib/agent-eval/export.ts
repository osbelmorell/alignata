import type { AgentEval, ItemStatus } from "./types";
import { VERDICT_RULE } from "./types";

const STATUS_LABEL: Record<ItemStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  na: "N/A",
  unset: "Unset",
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

export function evalToJson(evalRecord: AgentEval): string {
  return JSON.stringify(evalRecord, null, 2);
}

export function evalToMarkdown(evalRecord: AgentEval): string {
  const lines: string[] = [];
  const badge =
    evalRecord.verdict === "PASS"
      ? "GO / PASS"
      : evalRecord.verdict === "FAIL"
        ? "NO-GO / FAIL"
        : "INCOMPLETE";

  lines.push(`# Agent Eval Go/No-Go — ${evalRecord.name || "(unnamed)"}`);
  lines.push("");
  lines.push(`- **Date:** ${evalRecord.date}`);
  lines.push(`- **Verdict:** **${badge}**`);
  lines.push(`- **Reason:** ${evalRecord.reasonSummary}`);
  lines.push(`- **Updated:** ${fmtTs(evalRecord.updatedAt)}`);
  lines.push(`- **Rule:** ${VERDICT_RULE}`);
  lines.push("");

  for (const s of evalRecord.sections) {
    lines.push(`## ${s.title}`);
    lines.push(`_${s.description}_`);
    lines.push("");
    lines.push("| Status | Required | Item | Notes |");
    lines.push("| --- | --- | --- | --- |");
    for (const i of s.items) {
      const notes = (i.notes || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(
        `| ${STATUS_LABEL[i.status]} | ${i.required ? "yes" : "no"} | ${i.label} | ${notes || "—"} |`,
      );
    }
    lines.push("");
  }

  lines.push("_Client-side Agent Eval Go/No-Go checklist · not indexed._");
  lines.push("");
  return lines.join("\n");
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

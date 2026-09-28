import type { ReactNode } from "react";

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return false;
  const cells = t.slice(1, -1).split("|").map((c) => c.trim());
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.includes("|", 1);
}

function splitCells(line: string): string[] {
  const t = line.trim();
  const inner = t.startsWith("|") ? t.slice(1) : t;
  const trimmed = inner.endsWith("|") ? inner.slice(0, -1) : inner;
  return trimmed.split("|").map((c) => c.trim());
}

/** Minimal markdown → React for digest bodies (headings, lists, paragraphs, bold, GFM tables). */
export function renderDigestMarkdown(md: string): ReactNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  function inline(text: string): ReactNode[] {
    const parts: ReactNode[] = [];
    const re = /\*\*([^*]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold text-[var(--cb-ink)]">
          {m[1]}
        </strong>,
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(
        <h1
          key={key++}
          className="mt-2 break-words text-2xl font-semibold tracking-tight text-[var(--cb-ink)] [overflow-wrap:anywhere]"
        >
          {inline(line.slice(2))}
        </h1>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(
        <h2
          key={key++}
          className="mt-8 break-words text-lg font-semibold text-[var(--cb-ink)] [overflow-wrap:anywhere]"
        >
          {inline(line.slice(3))}
        </h2>,
      );
      i += 1;
      continue;
    }
    // GFM table: header row + separator + body rows
    if (
      isTableRow(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const header = splitCells(line);
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]) && !isTableSeparator(lines[i])) {
        bodyRows.push(splitCells(lines[i]));
        i += 1;
      }
      out.push(
        <div
          key={key++}
          className="mt-4 max-w-full overflow-x-auto rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)]"
        >
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm text-[var(--cb-ink-muted)]">
            <thead>
              <tr className="border-b border-[var(--cb-line)] bg-[var(--cb-bg)]">
                {header.map((cell, ci) => (
                  <th
                    key={ci}
                    className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--cb-ink)]"
                  >
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-[var(--cb-line)] last:border-b-0"
                >
                  {header.map((_, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 align-top break-words [overflow-wrap:anywhere]"
                    >
                      {inline(row[ci] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith("- ") || /^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || /^\d+\.\s/.test(lines[i]))) {
        const item = lines[i].replace(/^(- |\d+\.\s)/, "");
        items.push(
          <li
            key={key++}
            className="min-w-0 break-words leading-relaxed text-[var(--cb-ink-muted)] [overflow-wrap:anywhere]"
          >
            {inline(item)}
          </li>,
        );
        i += 1;
      }
      out.push(
        <ul key={key++} className="mt-3 max-w-full list-disc space-y-1.5 overflow-x-hidden pl-5">
          {items}
        </ul>,
      );
      continue;
    }
    // fenced code blocks — keep as pre so they don't collapse into paragraphs
    if (line.trim().startsWith("```")) {
      const fenceLang = line.trim().slice(3).trim();
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // closing fence
      out.push(
        <pre
          key={key++}
          className="mt-3 max-w-full overflow-x-auto rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-bg)] p-3 text-xs leading-relaxed text-[var(--cb-ink)]"
        >
          <code data-lang={fenceLang || undefined}>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const buf: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("- ") &&
      !/^\d+\.\s/.test(lines[i]) &&
      !(
        isTableRow(lines[i]) &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      ) &&
      !lines[i].trim().startsWith("```")
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    out.push(
      <p
        key={key++}
        className="mt-3 max-w-full break-words leading-relaxed text-[var(--cb-ink-muted)] [overflow-wrap:anywhere]"
      >
        {inline(buf.join(" "))}
      </p>,
    );
  }
  return out;
}

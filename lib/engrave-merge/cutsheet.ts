import { flat } from "./pytext";
import type { CutItem } from "./types";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

/**
 * Printable cut sheet (SPEC §6.4): one <h2> per listing with "(N to make)", black on
 * white, 16px+, break-inside: avoid per item. Built in the browser only.
 */
export function cutsheetHtml(cut: CutItem[], title = "Cut sheet"): string {
  const groups = new Map<string, { item: string; items: CutItem[] }>();
  for (const c of cut) {
    const k = JSON.stringify([c.item, c.lid]);
    const g = groups.get(k) || { item: c.item, items: [] };
    g.items.push(c);
    groups.set(k, g);
  }
  const out = [
    `<!doctype html><meta charset='utf-8'><title>${esc(title)}</title>`,
    "<style>body{font:16px/1.4 system-ui,sans-serif;color:#121410;background:#fff;margin:24px}" +
      "h1{font-size:24px}h2{font-size:18px;margin:24px 0 8px;break-after:avoid}table{border-collapse:collapse;width:100%}" +
      "td,th{border:1px solid #999;padding:6px;vertical-align:top;text-align:left;font-size:16px}" +
      "tr{break-inside:avoid}.t{white-space:pre-wrap;font-weight:600}.f{color:#8a1c1c}" +
      "@media print{body{margin:0}}</style>",
    `<h1>${esc(title)}</h1>`,
  ];
  for (const { item, items } of groups.values()) {
    const n = items.reduce((s, c) => s + c.qty, 0);
    out.push(`<h2>${esc(item)} <span>(${n} to make)</span></h2>`);
    out.push(
      "<table><tr><th>Done</th><th>Merge row</th><th>Order</th><th>Name</th><th>Qty</th><th>Options</th><th>Text</th></tr>",
    );
    for (const c of items) {
      const opts = c.ok
        ? c.pairs
            .filter((p) => !p.isText)
            .map((p) => `${esc(p.label)}: ${esc(flat(p.value))}`)
            .join("<br>")
        : esc(c.raw);
      const flag = c.flags.map((f) => `<div class='f'>Check: ${esc(f)}</div>`).join("");
      out.push(
        `<tr><td>&#9744;</td><td>${esc(c.rows)}</td><td>${esc(c.order)}</td><td>${esc(c.fn)}</td><td>${c.qty}</td>` +
          `<td>${opts}</td><td><div class='t'>${esc(c.text)}</div>${flag}</td></tr>`,
      );
    }
    out.push("</table>");
  }
  return out.join("\n") + "\n";
}

/** Print via a hidden same-document iframe (no server render, no new network request). */
export function printCutsheet(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}

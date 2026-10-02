import { readCsv } from "./csv";
import { decodeEntities } from "./entities";
import { type GlyphCheck, IGNORABLE, isEmojiChar } from "./glyphs";
import { splitLines } from "./lines";
import {
  casefold,
  cmpCodePoints,
  cmpNumKey,
  cpLength,
  flat,
  isAsciiDigits,
  isPySpace,
  normLabel,
  pySplit,
  pyStrip,
} from "./pytext";
import {
  DEFAULT_SETTINGS,
  type CutItem,
  type ListingRecipe,
  type ProblemCode,
  type ProblemItem,
  type ProcessResult,
  type Recipe,
  type Settings,
} from "./types";
import { type Pair, parseVariations } from "./variations";

export const REQUIRED_COLUMNS = ["Item Name", "Quantity", "Transaction ID", "Listing ID", "Order ID", "Variations"];
export const OPTIONAL_COLUMNS = ["Buyer", "Ship Name", "Date Shipped", "SKU"];

export const MERGE_FIXED = [
  "Row", "Order ID", "First name", "Listing ID", "Item", "SKU", "Copy",
  "Option 1", "Option 2", "Option 3", "Other options", "Personalization",
];
export const EXC_HEADER = [
  "Order ID", "Transaction ID", "Listing ID", "Item", "First name", "Quantity",
  "Problem", "Problem code", "Details", "Personalization", "Variations",
];

/** Fixed order = order of a row's problems inside the problem list. */
export const PROBLEMS: Record<ProblemCode, string> = {
  UNREADABLE_OPTIONS: "Couldn't read the options for this item",
  BAD_QUANTITY: "Quantity looks wrong",
  DUPLICATE: "Same item appears twice in the file",
  BLANK_TEXT: "No personalization text",
  TOO_LONG: "Text is longer than your limit",
  TOO_MANY_LINES: "More lines than your merge file has",
  EMOJI: "Has an emoji your laser may not engrave",
  MISSING_GLYPH: "Your font is missing some letters",
};
const CODE_ORDER = Object.keys(PROBLEMS) as ProblemCode[];

const PLACEHOLDER_RE = /^\s*not requested on this item\.?\s*$/i;
const TRAILING_USERNAME_RE = /\s*\([^)]*\)\s*$/;

export function firstName(buyer: string, shipName: string): string {
  const b = pyStrip((buyer || "").replace(TRAILING_USERNAME_RE, ""));
  const src = b || pyStrip(shipName || "");
  const parts = pySplit(src);
  return parts.length ? parts[0] : "";
}

/** Sorted unique trimmed non-blank Order IDs (input to the file fingerprint, SPEC §8.2). */
export function orderIdsOf(rows: Record<string, string>[]): string[] {
  const ids = new Set<string>();
  for (const r of rows) {
    const v = pyStrip(r["Order ID"] || "");
    if (v) ids.add(v);
  }
  return [...ids].sort(cmpCodePoints);
}

export interface ProcessOptions {
  settings?: Partial<Settings>;
  /** Settings keys the seller set on screen; these win over the settings file. */
  explicit?: (keyof Settings)[];
  recipe?: Recipe | null;
  glyphCheck?: GlyphCheck | null;
  /** "Which items": only this Listing ID goes into the merge file (renumbered from 1). */
  listing?: string | null;
}

interface Item {
  idx: number;
  r: Record<string, string>;
  lid: string;
  lr: ListingRecipe;
  ok: boolean;
  pairs: Pair[];
  textPairs: Pair[];
  optPairs: Pair[];
  values: string[];
  pers: string;
  hasTextLabel: boolean;
  placeholder: boolean;
  dup: boolean;
  qRaw: string;
  qty: number | null;
  codes: [ProblemCode, string][];
  lines?: string[];
}

export function process(text: string, opts: ProcessOptions = {}): ProcessResult {
  const cfg: Settings = { ...DEFAULT_SETTINGS, ...(opts.settings || {}) };
  const recipe = opts.recipe || null;
  const explicit = new Set(opts.explicit || []);
  const rs = recipe?.settings || {};
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (k in rs && rs[k] !== undefined && !explicit.has(k)) {
      (cfg as unknown as Record<string, unknown>)[k] = rs[k];
    }
  }
  const rlist = recipe?.listings || {};
  const extraGlobal = new Set((recipe?.extraLabels || []).map(normLabel));

  const { header, rows } = readCsv(text);
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    return {
      error: "WRONG_FILE",
      missing,
      soldOrdersFile: header.includes("Full Name") && !header.includes("Variations"),
    };
  }

  const orderIds = orderIdsOf(rows);
  const totalRows = rows.length;
  const kept = rows.filter((r) => cfg.includeShipped || !pyStrip(r["Date Shipped"] || ""));

  const items: Item[] = [];
  const seenTxn = new Set<string>();
  kept.forEach((r, idx) => {
    const lid = pyStrip(r["Listing ID"] || "");
    const lr: ListingRecipe = Object.prototype.hasOwnProperty.call(rlist, lid) ? rlist[lid] || {} : {};
    const textLabels = new Set((lr.textFields || []).map(normLabel));
    const extra = new Set([
      ...extraGlobal,
      ...[lr.option1, lr.option2, lr.option3].filter((x): x is string => !!x).map(normLabel),
    ]);
    const { pairs, ok } = parseVariations(r["Variations"] || "", textLabels, extra);
    let textPairs = pairs.filter((p) => p.isText);
    const optPairs = pairs.filter((p) => !p.isText);
    if (lr.textFields && lr.textFields.length) {
      const order = lr.textFields.map(normLabel);
      const pos = (p: Pair) => {
        const i = order.indexOf(normLabel(p.label));
        return i >= 0 ? i : 99;
      };
      textPairs = [...textPairs].sort((a, b) => pos(a) - pos(b));
    }
    const placeholder = textPairs.some((p) => PLACEHOLDER_RE.test(p.value));
    const values = textPairs.map((p) => (PLACEHOLDER_RE.test(p.value) ? "" : p.value));
    const pers = flat(values.filter((v) => pyStrip(v)).join(" "));
    const txn = pyStrip(r["Transaction ID"] || "");
    const dup = !!txn && seenTxn.has(txn);
    if (txn) seenTxn.add(txn);
    const qRaw = pyStrip(r["Quantity"] || "");
    const qty = isAsciiDigits(qRaw) && parseInt(qRaw, 10) >= 1 ? parseInt(qRaw, 10) : null;
    items.push({
      idx, r, lid, lr, ok, pairs, textPairs, optPairs, values, pers,
      hasTextLabel: textPairs.length > 0, placeholder, dup, qRaw, qty, codes: [],
    });
  });

  // listing personalization rate (readable, non-duplicate rows)
  const rate = new Map<string, [number, number]>();
  for (const it of items) {
    if (it.ok && !it.dup) {
      const a = rate.get(it.lid) || [0, 0];
      a[1] += 1;
      a[0] += it.pers ? 1 : 0;
      rate.set(it.lid, a);
    }
  }

  for (const it of items) {
    const codes = it.codes;
    const lr = it.lr;
    const limit = ("charLimit" in lr && lr.charLimit !== undefined ? lr.charLimit : cfg.charLimit) || 0;
    if (!it.ok) codes.push(["UNREADABLE_OPTIONS", "Options don't start with a label like Size:"]);
    if (it.qty === null) codes.push(["BAD_QUANTITY", `Quantity is "${it.qRaw}"`]);
    if (it.dup) {
      codes.push([
        "DUPLICATE",
        `Transaction ID ${pyStrip(it.r["Transaction ID"])} appears more than once; kept the first`,
      ]);
      continue;
    }
    if (!it.ok) continue;
    const lines = cfg.splitLines ? splitLines(it.values, cfg.stripNumbers) : [];
    it.lines = lines;
    if (!it.pers) {
      const req = lr.requiresPersonalization;
      const [nText, nAll] = rate.get(it.lid) || [0, 0];
      if (req === false) {
        // seller says this listing never needs text
      } else if (it.placeholder) codes.push(["BLANK_TEXT", "Etsy says personalization was not requested"]);
      else if (it.hasTextLabel) codes.push(["BLANK_TEXT", "Personalization box was empty"]);
      else if (req === true) codes.push(["BLANK_TEXT", "Your settings say this item needs text"]);
      else if (nAll >= 2 && nText * 2 >= nAll)
        codes.push(["BLANK_TEXT", "Most orders for this item have text; this one has none"]);
      continue;
    }
    if (limit) {
      if (cfg.splitLines) {
        for (let i = 0; i < lines.length; i++) {
          const n = cpLength(lines[i].normalize("NFC"));
          if (n > limit) {
            codes.push(["TOO_LONG", `Line ${i + 1} is ${n} characters (limit ${limit})`]);
            break;
          }
        }
      } else {
        const n = cpLength(it.pers.normalize("NFC"));
        if (n > limit) codes.push(["TOO_LONG", `Text is ${n} characters (limit ${limit})`]);
      }
    }
    if (cfg.splitLines && lines.length > cfg.lineColumns) {
      codes.push(["TOO_MANY_LINES", `${lines.length} lines; your merge file has ${cfg.lineColumns}`]);
    }
    const alltext = it.values.join("");
    const emo: string[] = [];
    for (const ch of alltext) if (isEmojiChar(ch) && !emo.includes(ch)) emo.push(ch);
    if (emo.length) codes.push(["EMOJI", "Emoji found: " + emo.join(" ")]);
    if (opts.glyphCheck) {
      const miss: string[] = [];
      for (const ch of alltext.normalize("NFC")) {
        const cp = ch.codePointAt(0)!;
        if (isPySpace(ch) || IGNORABLE.has(cp) || isEmojiChar(ch) || opts.glyphCheck(cp) || miss.includes(ch)) continue;
        miss.push(ch);
      }
      if (miss.length) codes.push(["MISSING_GLYPH", "Missing from your font: " + miss.join(" ")]);
    }
  }

  const itemNameOf = (r: Record<string, string>) => flat(decodeEntities(r["Item Name"]));
  const sortName = new Map(items.map((it) => [it, casefold(itemNameOf(it.r))]));
  items.sort(
    (a, b) =>
      cmpCodePoints(sortName.get(a)!, sortName.get(b)!) ||
      cmpNumKey(a.lid, b.lid) ||
      cmpNumKey(a.r["Order ID"], b.r["Order ID"]) ||
      cmpNumKey(a.r["Transaction ID"], b.r["Transaction ID"]) ||
      a.idx - b.idx,
  );

  const ncols = cfg.lineColumns;
  const mergeHeader = [...MERGE_FIXED, ...Array.from({ length: ncols }, (_, i) => `Line ${i + 1}`)];
  const mergeRows: string[][] = [];
  const excRows: string[][] = [];
  const problems: ProblemItem[] = [];
  const cut: CutItem[] = [];
  let totalItems = 0;
  let heldItems = 0;
  let flaggedInMerge = 0;
  for (const it of items) {
    const r = it.r;
    const itemName = itemNameOf(r);
    const fn = firstName(r["Buyer"] || "", r["Ship Name"] || "");
    const orderId = pyStrip(r["Order ID"] || "");
    const sortedCodes = [...it.codes].sort((a, b) => CODE_ORDER.indexOf(a[0]) - CODE_ORDER.indexOf(b[0]));
    for (const [code, details] of sortedCodes) {
      excRows.push([
        orderId, pyStrip(r["Transaction ID"] || ""), it.lid, itemName, fn, it.qRaw,
        PROBLEMS[code], code, details, it.pers,
        pyStrip(decodeEntities(r["Variations"])).replace(/\n/g, " / "),
      ]);
    }
    const flagged = it.codes.length > 0;
    const held = it.dup || (flagged && !cfg.includeFlagged);
    const copies = it.qty || 1;
    const inScope = !opts.listing || it.lid === opts.listing;
    if (flagged) {
      problems.push({
        order: orderId, item: itemName, fn, qty: it.qRaw, problems: sortedCodes.map(([c]) => PROBLEMS[c]), held,
        dup: it.dup, badQty: it.qty === null, counted: it.dup ? 0 : copies, inScope,
      });
    }
    if (it.dup) continue;
    if (inScope) {
      totalItems += copies;
      if (held) heldItems += copies;
      else if (flagged) flaggedInMerge += copies;
    }
    const lr = it.lr;
    const slots = ["", "", ""];
    const used = new Set<number>();
    const wanted = [lr.option1, lr.option2, lr.option3];
    if (wanted.some(Boolean)) {
      wanted.forEach((w, si) => {
        if (!w) return;
        for (let pi = 0; pi < it.optPairs.length; pi++) {
          if (!used.has(pi) && normLabel(it.optPairs[pi].label) === normLabel(w)) {
            slots[si] = flat(it.optPairs[pi].value);
            used.add(pi);
            break;
          }
        }
      });
    } else {
      it.optPairs.slice(0, 3).forEach((p, pi) => {
        slots[pi] = flat(p.value);
        used.add(pi);
      });
    }
    const other = it.optPairs
      .map((p, pi) => (used.has(pi) ? null : `${p.label}: ${flat(p.value)}`))
      .filter((x): x is string => x !== null)
      .join("; ");
    const lines = (it.lines || []).slice(0, ncols);
    const c: CutItem = {
      item: itemName, lid: it.lid, order: orderId, fn, qty: copies, pairs: it.pairs,
      raw: pyStrip(decodeEntities(r["Variations"])), ok: it.ok,
      flags: it.codes.map(([code]) => PROBLEMS[code]),
      text: it.values.filter((v) => pyStrip(v)).join("\n"), rows: "held",
    };
    cut.push(c);
    if (flagged && !cfg.includeFlagged) continue;
    if (opts.listing && it.lid !== opts.listing) {
      c.rows = "other file";
      continue;
    }
    const firstRow = mergeRows.length + 1;
    c.rows = copies === 1 ? `${firstRow}` : `${firstRow}-${firstRow + copies - 1}`;
    for (let k = 1; k <= copies; k++) {
      mergeRows.push([
        String(mergeRows.length + 1), orderId, fn, it.lid, itemName, pyStrip(r["SKU"] || ""),
        `${k} of ${copies}`, ...slots, other, it.pers,
        ...lines, ...Array<string>(ncols - lines.length).fill(""),
      ]);
    }
  }

  const physical = items.filter((it) => !it.dup).reduce((s, it) => s + (it.qty || 1), 0);

  // listings + labels seen (for the Item settings UI); file order
  const lmap = new Map<string, { lid: string; itemName: string; labels: string[] }>();
  for (const r of rows) {
    const lid = pyStrip(r["Listing ID"] || "");
    if (!lid) continue;
    let e = lmap.get(lid);
    if (!e) {
      e = { lid, itemName: itemNameOf(r), labels: [] };
      lmap.set(lid, e);
    }
    for (const p of parseVariations(r["Variations"] || "").pairs) {
      if (!e.labels.includes(p.label)) e.labels.push(p.label);
    }
  }

  return {
    mergeHeader, mergeRows, excRows, problems, cut, orderIds,
    listings: [...lmap.values()],
    garbled: text.includes("\ufffd"),
    stats: {
      row_count: totalRows,
      item_count: physical,
      exception_count: excRows.length,
      merge_row_count: mergeRows.length,
      hidden_shipped: totalRows - kept.length,
      order_count: orderIds.length,
      total_items: totalItems,
      ready_items: mergeRows.length,
      held_items: heldItems,
      flagged_in_merge_items: flaggedInMerge,
    },
  };
}

#!/usr/bin/env python3
"""Engrave Merge - reference parser (stdlib only, Python 3.10+).

This is the executable version of SPEC.md section 5-7. The production TypeScript
(lib/engrave-merge/*) must produce byte-identical merge + exceptions CSVs for every
case in cases.json.

Usage:
  python3 parse_reference.py --check            # run all cases, diff vs expected/
  python3 parse_reference.py --write            # (re)write expected/ for cases not marked hand_authored
  python3 parse_reference.py FILE.csv [--out DIR] [--include-shipped] [--include-flagged]
        [--char-limit N] [--no-split] [--line-columns N] [--keep-numbers]
        [--charset FILE | --font FILE.ttf] [--recipe FILE.json] [--cutsheet]
"""
import argparse, csv, hashlib, html, io, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))

REQUIRED_COLUMNS = ["Item Name", "Quantity", "Transaction ID", "Listing ID", "Order ID", "Variations"]
OPTIONAL_COLUMNS = ["Buyer", "Ship Name", "Date Shipped", "SKU"]

MERGE_FIXED = ["Row", "Order ID", "First name", "Listing ID", "Item", "SKU", "Copy",
               "Option 1", "Option 2", "Option 3", "Other options", "Personalization"]
EXC_HEADER = ["Order ID", "Transaction ID", "Listing ID", "Item", "First name", "Quantity",
              "Problem", "Problem code", "Details", "Personalization", "Variations"]

# Fixed order = sort order inside exceptions.csv for one source row.
PROBLEMS = {
    "UNREADABLE_OPTIONS": "Couldn't read the options for this item",
    "BAD_QUANTITY": "Quantity looks wrong",
    "DUPLICATE": "Same item appears twice in the file",
    "BLANK_TEXT": "No personalization text",
    "TOO_LONG": "Text is longer than your limit",
    "TOO_MANY_LINES": "More lines than your merge file has",
    "EMOJI": "Has an emoji your laser may not engrave",
    "MISSING_GLYPH": "Your font is missing some letters",
}
CODE_ORDER = list(PROBLEMS)

# Labels we trust as the start of a new "Label:value" pair (compared case-insensitively,
# whitespace-collapsed). Extend freely; unknown labels still pass the heuristic below
# when the CURRENT pair is a normal option (not personalization text).
KNOWN_LABELS = {
    "size", "style", "color", "colour", "material", "font", "font style", "font color",
    "finish", "design", "design options", "length", "width", "height", "thickness",
    "wood", "wood type", "metal", "metal type", "shape", "quantity", "set", "set size",
    "pack", "option", "options", "type", "glass type", "frame", "frame color",
    "color of name", "primary color", "secondary color", "accessory", "add on", "add-on",
    "gift wrap", "gift box", "engraving side", "side", "chain length", "ring size",
}
PERS_LABEL_RE = re.compile(r"^personali[sz]ation(?:\s*#?\s*\d+)?$", re.I)
BOUNDARY_RE = re.compile(r",[ \t]*([^,:\n]{1,40}):")
FIRST_LABEL_RE = re.compile(r"^[ \t]*([^,:\n]{1,40}):")
PLACEHOLDER_RE = re.compile(r"^\s*not requested on this item\.?\s*$", re.I)
NUM_MARK_RE = re.compile(r"(?:(?<=\s)|^)(\d{1,2})[.)]\s+")
LINE_NUM_RE = re.compile(r"^\s*(\d{1,2})[.)]\s+")

# Exact copy of JS /\p{Extended_Pictographic}/u (generated with Node), minus (c) (R) TM.
_EP = [[169,169],[174,174],[8252,8252],[8265,8265],[8482,8482],[8505,8505],[8596,8601],[8617,8618],[8986,8987],[9000,9000],[9096,9096],[9167,9167],[9193,9203],[9208,9210],[9410,9410],[9642,9643],[9654,9654],[9664,9664],[9723,9726],[9728,9733],[9735,9746],[9748,9861],[9872,9989],[9992,10002],[10004,10004],[10006,10006],[10013,10013],[10017,10017],[10024,10024],[10035,10036],[10052,10052],[10055,10055],[10060,10060],[10062,10062],[10067,10069],[10071,10071],[10083,10087],[10133,10135],[10145,10145],[10160,10160],[10175,10175],[10548,10549],[11013,11015],[11035,11036],[11088,11088],[11093,11093],[12336,12336],[12349,12349],[12951,12951],[12953,12953],[126976,127231],[127245,127247],[127279,127279],[127340,127345],[127358,127359],[127374,127374],[127377,127386],[127405,127461],[127489,127503],[127514,127514],[127535,127535],[127538,127546],[127548,127551],[127561,127994],[128000,128317],[128326,128591],[128640,128767],[128884,128895],[128981,129023],[129036,129039],[129096,129103],[129114,129119],[129160,129167],[129198,129279],[129292,129338],[129340,129349],[129351,129791],[130048,131069]]
EMOJI_EXEMPT = {0x00A9, 0x00AE, 0x2122}
IGNORABLE = {0xFE0E, 0xFE0F, 0x200D, 0x20E3}

DEFAULTS = dict(include_shipped=False, include_flagged=False, split_lines=True,
                line_columns=6, char_limit=40, strip_numbers=True)


def is_emoji_cp(cp):
    if cp in EMOJI_EXEMPT:
        return False
    lo, hi = 0, len(_EP) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        a, b = _EP[mid]
        if cp < a: hi = mid - 1
        elif cp > b: lo = mid + 1
        else: return True
    return False


def norm_label(s):
    return re.sub(r"\s+", " ", s).strip().lower()


def flat(s):
    return re.sub(r"\s+", " ", s).strip()


def decode_entities(s):
    return html.unescape(s or "").replace("\r\n", "\n").replace("\r", "\n")


def looks_like_label(label):
    t = label.strip()
    if not t or not t[0].isalpha() or not t[0].isupper():
        return False
    words = [w for w in re.split(r"\s+", t) if re.search(r"[A-Za-z]", w)]
    return 1 <= len(words) <= 5 and len(t) <= 40


def parse_variations(raw, text_labels=frozenset(), extra_labels=frozenset()):
    """Returns (pairs, ok). pairs = [(label_display, value, is_text)]."""
    s = decode_entities(raw).strip()
    if not s:
        return [], True
    if re.fullmatch(r"personali[sz]ation", s, re.I):  # bare label, seen in public test data
        return [("Personalization", "", True)], True
    m = FIRST_LABEL_RE.match(s)
    if not m:
        return [], False

    def is_text(lbl):
        n = norm_label(lbl)
        return bool(PERS_LABEL_RE.match(n)) or n in text_labels

    starts = [(m.start(1), m.end(1) + 1, m.group(1))]  # (label start, value start, label)
    cur_text = is_text(m.group(1))
    for b in BOUNDARY_RE.finditer(s, m.end()):
        if b.start() < starts[-1][1]:
            continue
        lbl = b.group(1)
        n = norm_label(lbl)
        if cur_text:
            accept = bool(PERS_LABEL_RE.match(n)) or n in text_labels or n in extra_labels
        else:
            accept = (n in KNOWN_LABELS or n in extra_labels or n in text_labels
                      or bool(PERS_LABEL_RE.match(n)) or looks_like_label(lbl))
        if accept:
            starts.append((b.start(), b.end(), lbl))
            cur_text = is_text(lbl)
    pairs = []
    for i, (ls, vs, lbl) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else len(s)
        val = s[vs:end].strip()
        pairs.append((flat(lbl), val, is_text(lbl)))
    return pairs, True


def split_lines(text_fields, strip_numbers):
    """text_fields: list of raw values (newlines kept). Returns list of lines."""
    if len(text_fields) > 1:
        return [flat(v) for v in text_fields]
    if not text_fields or not text_fields[0].strip():
        return []
    t = text_fields[0].strip()
    if "\n" in t:
        lines = [ln.strip() for ln in t.split("\n") if ln.strip()]
        nums = [LINE_NUM_RE.match(ln) for ln in lines]
        if strip_numbers and len(lines) >= 2 and all(nums) and                 [int(x.group(1)) for x in nums] == list(range(1, len(lines) + 1)):
            lines = [LINE_NUM_RE.sub("", ln, count=1).strip() for ln in lines]
        return [flat(ln) for ln in lines]
    marks = list(NUM_MARK_RE.finditer(t))
    if strip_numbers and len(marks) >= 2 and marks[0].start() == 0 and             [int(x.group(1)) for x in marks] == list(range(1, len(marks) + 1)):
        out = []
        for i, mk in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(t)
            out.append(flat(t[mk.end():end]))
        return out
    return [flat(t)]


def first_name(buyer, ship_name):
    b = re.sub(r"\s*\([^)]*\)\s*$", "", buyer or "").strip()
    src = b or (ship_name or "").strip()
    return src.split()[0] if src.split() else ""


def num_key(v):
    v = (v or "").strip()
    return (0, int(v), "") if v.isdigit() else (1, 0, v)


def fingerprint(rows):
    ids = sorted({(r.get("Order ID") or "").strip() for r in rows} - {""})
    return hashlib.sha256("\n".join(ids).encode("utf-8")).hexdigest()


def read_csv(text):
    if text.startswith("\ufeff"):
        text = text[1:]
    rdr = csv.DictReader(io.StringIO(text, newline=""))
    rows = list(rdr)
    return rdr.fieldnames or [], rows


def load_charset(path):
    if not path:
        return None
    if path.lower().endswith((".ttf", ".otf")):
        from fontTools.ttLib import TTFont  # optional dependency
        return set(TTFont(path).getBestCmap().keys())
    return {ord(c) for c in open(path, encoding="utf-8").read() if c not in "\r\n"}


def process(text, cfg=None, recipe=None, charset=None):
    cfg = {**DEFAULTS, **(cfg or {})}
    recipe = recipe or {}
    rsettings = recipe.get("settings") or {}
    for k_json, k in [("includeShipped", "include_shipped"), ("includeFlagged", "include_flagged"),
                      ("splitLines", "split_lines"), ("lineColumns", "line_columns"),
                      ("charLimit", "char_limit"), ("stripNumbers", "strip_numbers")]:
        if k_json in rsettings and k not in (cfg.get("_explicit") or ()):
            cfg[k] = rsettings[k_json]
    rlist = recipe.get("listings") or {}
    extra_global = {norm_label(x) for x in recipe.get("extraLabels") or []}

    header, rows = read_csv(text)
    missing = [c for c in REQUIRED_COLUMNS if c not in header]
    if missing:
        return {"error": "WRONG_FILE", "missing": missing}

    fp = fingerprint(rows)
    total_rows = len(rows)
    kept = [r for r in rows if cfg["include_shipped"] or not (r.get("Date Shipped") or "").strip()]

    items = []
    seen_txn = set()
    for idx, r in enumerate(kept):
        lid = (r.get("Listing ID") or "").strip()
        lr = rlist.get(lid) or {}
        text_labels = frozenset(norm_label(x) for x in lr.get("textFields") or [])
        extra = frozenset(extra_global | {norm_label(x) for x in
                          [lr.get("option1"), lr.get("option2"), lr.get("option3")] if x})
        raw_var = r.get("Variations") or ""
        pairs, ok = parse_variations(raw_var, text_labels, extra)
        text_pairs = [p for p in pairs if p[2]]
        opt_pairs = [p for p in pairs if not p[2]]
        if lr.get("textFields"):
            order = [norm_label(x) for x in lr["textFields"]]
            text_pairs.sort(key=lambda p: order.index(norm_label(p[0])) if norm_label(p[0]) in order else 99)
        placeholder = any(PLACEHOLDER_RE.match(p[1]) for p in text_pairs)
        values = ["" if PLACEHOLDER_RE.match(p[1]) else p[1] for p in text_pairs]
        pers_flat = flat(" ".join(v for v in values if v.strip()))
        txn = (r.get("Transaction ID") or "").strip()
        dup = bool(txn) and txn in seen_txn
        if txn:
            seen_txn.add(txn)
        q_raw = (r.get("Quantity") or "").strip()
        qty = int(q_raw) if q_raw.isdigit() and int(q_raw) >= 1 else None
        items.append(dict(idx=idx, r=r, lid=lid, lr=lr, ok=ok, pairs=pairs, text_pairs=text_pairs,
                          opt_pairs=opt_pairs, values=values, pers=pers_flat,
                          has_text_label=bool(text_pairs), placeholder=placeholder,
                          dup=dup, q_raw=q_raw, qty=qty, codes=[]))

    # listing personalization rate (parseable, non-duplicate rows)
    rate = {}
    for it in items:
        if it["ok"] and not it["dup"]:
            a = rate.setdefault(it["lid"], [0, 0])
            a[1] += 1
            a[0] += 1 if it["pers"] else 0

    for it in items:
        codes = it["codes"]
        lr = it["lr"]
        limit = lr.get("charLimit", cfg["char_limit"]) or 0
        if not it["ok"]:
            codes.append(("UNREADABLE_OPTIONS", "Options don't start with a label like Size:"))
        if it["qty"] is None:
            codes.append(("BAD_QUANTITY", f'Quantity is "{it["q_raw"]}"'))
        if it["dup"]:
            codes.append(("DUPLICATE", f'Transaction ID {it["r"]["Transaction ID"].strip()} appears more than once; kept the first'))
            continue
        if not it["ok"]:
            continue
        lines = split_lines(it["values"], cfg["strip_numbers"]) if cfg["split_lines"] else []
        it["lines"] = lines
        if not it["pers"]:
            req = lr.get("requiresPersonalization")
            n_text, n_all = rate.get(it["lid"], [0, 0])
            if req is False:
                pass
            elif it["placeholder"]:
                codes.append(("BLANK_TEXT", "Etsy says personalization was not requested"))
            elif it["has_text_label"]:
                codes.append(("BLANK_TEXT", "Personalization box was empty"))
            elif req is True:
                codes.append(("BLANK_TEXT", "Your settings say this item needs text"))
            elif n_all >= 2 and n_text * 2 >= n_all:
                codes.append(("BLANK_TEXT", "Most orders for this item have text; this one has none"))
            continue
        if limit:
            if cfg["split_lines"]:
                for i, ln in enumerate(lines, 1):
                    n = len(unicodedata.normalize("NFC", ln))
                    if n > limit:
                        codes.append(("TOO_LONG", f"Line {i} is {n} characters (limit {limit})"))
                        break
            else:
                n = len(unicodedata.normalize("NFC", it["pers"]))
                if n > limit:
                    codes.append(("TOO_LONG", f"Text is {n} characters (limit {limit})"))
        if cfg["split_lines"] and len(lines) > cfg["line_columns"]:
            codes.append(("TOO_MANY_LINES", f'{len(lines)} lines; your merge file has {cfg["line_columns"]}'))
        alltext = "".join(it["values"])
        emo = []
        for ch in alltext:
            if is_emoji_cp(ord(ch)) and ch not in emo:
                emo.append(ch)
        if emo:
            codes.append(("EMOJI", "Emoji found: " + " ".join(emo)))
        if charset is not None:
            miss = []
            for ch in unicodedata.normalize("NFC", alltext):
                cp = ord(ch)
                if ch.isspace() or cp in IGNORABLE or is_emoji_cp(cp) or cp in charset or ch in miss:
                    continue
                miss.append(ch)
            if miss:
                codes.append(("MISSING_GLYPH", "Missing from your font: " + " ".join(miss)))

    def sort_key(it):
        r = it["r"]
        return (flat(decode_entities(r.get("Item Name"))).casefold(), num_key(it["lid"]),
                num_key(r.get("Order ID")), num_key(r.get("Transaction ID")), it["idx"])

    items.sort(key=sort_key)
    ncols = cfg["line_columns"]
    merge_header = MERGE_FIXED + [f"Line {i}" for i in range(1, ncols + 1)]
    merge_rows, exc_rows, cut = [], [], []
    for it in items:
        r = it["r"]
        item_name = flat(decode_entities(r.get("Item Name")))
        fn = first_name(r.get("Buyer"), r.get("Ship Name"))
        for code in sorted(it["codes"], key=lambda c: CODE_ORDER.index(c[0])):
            exc_rows.append([r.get("Order ID", "").strip(), r.get("Transaction ID", "").strip(), it["lid"],
                             item_name, fn, it["q_raw"], PROBLEMS[code[0]], code[0], code[1], it["pers"],
                             decode_entities(r.get("Variations")).strip().replace("\n", " / ")])
        if it["dup"]:
            continue
        flagged = bool(it["codes"])
        # option slots
        lr = it["lr"]
        slots = ["", "", ""]
        used = set()
        wanted = [lr.get("option1"), lr.get("option2"), lr.get("option3")]
        if any(wanted):
            for si, w in enumerate(wanted):
                if not w:
                    continue
                for pi, p in enumerate(it["opt_pairs"]):
                    if pi not in used and norm_label(p[0]) == norm_label(w):
                        slots[si] = flat(p[1]); used.add(pi); break
        else:
            for pi, p in enumerate(it["opt_pairs"][:3]):
                slots[pi] = flat(p[1]); used.add(pi)
        other = "; ".join(f"{p[0]}: {flat(p[1])}" for pi, p in enumerate(it["opt_pairs"]) if pi not in used)
        copies = it["qty"] or 1
        lines = (it.get("lines") or [])[:ncols]
        cut.append(dict(item=item_name, lid=it["lid"], order=r.get("Order ID", "").strip(), fn=fn,
                        qty=copies, pairs=it["pairs"], raw=decode_entities(r.get("Variations")).strip(),
                        ok=it["ok"], flags=[PROBLEMS[c[0]] for c in it["codes"]],
                        text="\n".join(v for v in it["values"] if v.strip()), rows="held"))
        if flagged and not cfg["include_flagged"]:
            continue
        if cfg.get("listing") and it["lid"] != cfg["listing"]:
            cut[-1]["rows"] = "other file"
            continue
        first_row = len(merge_rows) + 1
        cut[-1]["rows"] = f"{first_row}" if copies == 1 else f"{first_row}-{first_row + copies - 1}"
        for k in range(1, copies + 1):
            merge_rows.append([str(len(merge_rows) + 1), r.get("Order ID", "").strip(), fn, it["lid"], item_name,
                               (r.get("SKU") or "").strip(), f"{k} of {copies}", *slots, other, it["pers"],
                               *(lines + [""] * (ncols - len(lines)))])
    physical = sum((it["qty"] or 1) for it in items if not it["dup"])
    return dict(merge_header=merge_header, merge_rows=merge_rows, exc_rows=exc_rows, cut=cut,
                stats=dict(row_count=total_rows, item_count=physical, exception_count=len(exc_rows),
                           merge_row_count=len(merge_rows), file_fingerprint=fp,
                           hidden_shipped=total_rows - len(kept)))


def to_csv(header, rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue()


def cutsheet_html(res, title="Cut sheet"):
    e = html.escape
    groups = {}
    for c in res["cut"]:
        groups.setdefault((c["item"], c["lid"]), []).append(c)
    out = ["<!doctype html><meta charset='utf-8'><title>%s</title>" % e(title),
           "<style>body{font:16px/1.4 system-ui,sans-serif;color:#121410;margin:24px}"
           "h2{font-size:18px;margin:24px 0 8px;break-after:avoid}table{border-collapse:collapse;width:100%}"
           "td,th{border:1px solid #999;padding:6px;vertical-align:top;text-align:left}"
           "tr{break-inside:avoid}.t{white-space:pre-wrap;font-weight:600}.f{color:#8a1c1c}"
           "@media print{body{margin:0}}</style>",
           "<h1>%s</h1>" % e(title)]
    for (item, lid), cs in groups.items():
        n = sum(c["qty"] for c in cs)
        out.append(f"<h2>{e(item)} <small>({n} to make)</small></h2>")
        out.append("<table><tr><th>Done</th><th>Merge row</th><th>Order</th><th>Name</th><th>Qty</th><th>Options</th><th>Text</th></tr>")
        for c in cs:
            opts = "<br>".join(f"{e(p[0])}: {e(flat(p[1]))}" for p in c["pairs"] if not p[2]) if c["ok"] else e(c["raw"])
            flag = "".join(f"<div class='f'>Check: {e(f)}</div>" for f in c["flags"])
            out.append(f"<tr><td>&#9744;</td><td>{e(c['rows'])}</td><td>{e(c['order'])}</td><td>{e(c['fn'])}</td><td>{c['qty']}</td>"
                       f"<td>{opts}</td><td><div class='t'>{e(c['text'])}</div>{flag}</td></tr>")
        out.append("</table>")
    return "\n".join(out) + "\n"


def run_case(case):
    text = open(os.path.join(HERE, case["fixture"]), encoding="utf-8", newline="").read()
    recipe = json.load(open(os.path.join(HERE, case["recipe"]), encoding="utf-8")) if case.get("recipe") else None
    charset = load_charset(os.path.join(HERE, case["charset"])) if case.get("charset") else None
    cfg = dict(case.get("config") or {})
    cfg["_explicit"] = tuple(cfg)
    return process(text, cfg, recipe, charset)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--out")
    ap.add_argument("--include-shipped", action="store_true")
    ap.add_argument("--include-flagged", action="store_true")
    ap.add_argument("--char-limit", type=int)
    ap.add_argument("--no-split", action="store_true")
    ap.add_argument("--line-columns", type=int)
    ap.add_argument("--keep-numbers", action="store_true")
    ap.add_argument("--charset")
    ap.add_argument("--font")
    ap.add_argument("--recipe")
    ap.add_argument("--listing", help="only this Listing ID in the merge file")
    ap.add_argument("--cutsheet", action="store_true")
    a = ap.parse_args()

    if a.check or a.write:
        cases = json.load(open(os.path.join(HERE, "cases.json"), encoding="utf-8"))["cases"]
        fails = 0
        fps = {}
        for c in cases:
            res = run_case(c)
            d = os.path.join(HERE, "expected", c["name"])
            fps[c["fixture"]] = res["stats"]["file_fingerprint"]
            got = {"expected_merge.csv": to_csv(res["merge_header"], res["merge_rows"]),
                   "expected_exceptions.csv": to_csv(EXC_HEADER, res["exc_rows"])}
            if a.write and not c.get("hand_authored"):
                os.makedirs(d, exist_ok=True)
                for fn, body in got.items():
                    open(os.path.join(d, fn), "w", encoding="utf-8", newline="").write(body)
                if c.get("cutsheet"):
                    open(os.path.join(d, "sample_cutsheet.html"), "w", encoding="utf-8").write(
                        cutsheet_html(res, "Cut sheet - " + c["fixture"]))
            for fn, body in got.items():
                p = os.path.join(d, fn)
                exp = open(p, encoding="utf-8", newline="").read() if os.path.exists(p) else None
                status = "PASS" if exp == body else "FAIL"
                fails += status == "FAIL"
                print(f"{status}  {c['name']:<32} {fn:<24} merge_rows={len(res['merge_rows'])} exceptions={len(res['exc_rows'])}")
                if status == "FAIL" and exp is not None:
                    import difflib
                    sys.stdout.writelines(difflib.unified_diff(exp.splitlines(True), body.splitlines(True), "expected", "got"))
            if c.get("cutsheet") and os.path.isdir(d) and not os.path.exists(os.path.join(d, "sample_cutsheet.html")):
                open(os.path.join(d, "sample_cutsheet.html"), "w", encoding="utf-8").write(
                    cutsheet_html(res, "Cut sheet - " + c["fixture"]))
        if a.write:
            json.dump({"note": "SHA-256 of sorted unique Order IDs joined by \n. Server must drop events with these fingerprints.",
                       "fingerprints": fps}, open(os.path.join(HERE, "fixture_fingerprints.json"), "w"), indent=2)
        print("ALL PASS" if not fails else f"{fails} FAIL(S)")
        sys.exit(1 if fails else 0)

    if not a.file:
        ap.error("give a CSV file, or --check")
    cfg = {}
    if a.include_shipped: cfg["include_shipped"] = True
    if a.include_flagged: cfg["include_flagged"] = True
    if a.char_limit is not None: cfg["char_limit"] = a.char_limit
    if a.no_split: cfg["split_lines"] = False
    if a.line_columns: cfg["line_columns"] = a.line_columns
    if a.keep_numbers: cfg["strip_numbers"] = False
    if a.listing: cfg["listing"] = a.listing
    cfg["_explicit"] = tuple(cfg)
    recipe = json.load(open(a.recipe, encoding="utf-8")) if a.recipe else None
    res = process(open(a.file, encoding="utf-8", newline="").read(), cfg, recipe, load_charset(a.font or a.charset))
    if "error" in res:
        print(json.dumps(res)); sys.exit(2)
    out = a.out or "."
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, "merge.csv"), "w", encoding="utf-8", newline="").write(to_csv(res["merge_header"], res["merge_rows"]))
    open(os.path.join(out, "exceptions.csv"), "w", encoding="utf-8", newline="").write(to_csv(EXC_HEADER, res["exc_rows"]))
    if a.cutsheet:
        open(os.path.join(out, "cutsheet.html"), "w", encoding="utf-8").write(cutsheet_html(res))
    print(json.dumps(res["stats"]))


if __name__ == "__main__":
    main()

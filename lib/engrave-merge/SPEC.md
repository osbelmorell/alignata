# Engrave Merge: build spec (private dogfood scaffold)

**Status:** Handoff to Eng Ops · written 2026-10-02 (ET) · **Scope:** PRIVATE DOGFOOD only. No payments, no public launch.
**Route:** `alignata.com/engrave-merge` · **Repo:** `osbelmorell/alignata` (Next.js on Vercel), same pattern as `/license-gate` and `/stripe-cleaver`.
**Executable source of truth for parsing:** `fixtures/parse_reference.py` + `fixtures/cases.json` + `fixtures/expected/`. Where this doc and the reference parser disagree, the golden files win. Raise it, don't guess.

---

## 1. WHAT / WHY / HOW

**WHAT.** A one-job browser tool. An Etsy seller drops in their **Sold Order Items** export (`EtsySoldOrderItems*.csv`) and gets back:
1. **LightBurn merge file** (`engrave-merge-YYYY-MM-DD.csv`): one row per physical item to make, with a header row of field names, for LightBurn's Variable Text → Merge/CSV mode.
2. **Problem list** (`engrave-merge-exceptions-YYYY-MM-DD.csv`): rows that need a human look, with a plain-words reason.
3. **Printable cut sheet** (HTML print view, then PDF via the browser's print): order ID, buyer **first name only**, item, options, personalization, grouped by listing, with the merge row number for each item.

**WHY.** Laser-engraving Etsy sellers hand-copy personalization text from orders into LightBurn one at a time. That's slow, and typos mean remakes. Etsy's export holds all the text, but it's buried inside one `Variations` cell ("Size:8 x 10 inches,Style:Style 6,Personalization:…"). Turning that cell into clean columns is the whole job.

**HOW.** Everything happens in the browser: FileReader, then the parser, then Blob downloads. **The file content and buyer data never leave the device.** No upload, no server parsing, no localStorage except one random install id (§8). The only network calls the tool makes are anonymous count events whose fields are fixed by an allow-list (§8). Prefetch GETs that Next.js makes for links in the shared site header (e.g. `/apps`) are fine: they carry no file data.

## 2. Route, page shell, privacy posture

- `app/engrave-merge/page.tsx` (server component, metadata) renders `components/engrave-merge/EngraveMergeDesk.tsx` (client). Logic lives in `lib/engrave-merge/` (`csv.ts`, `variations.ts`, `process.ts`, `outputs.ts`, `cutsheet.ts`, `recipe.ts`, `glyphs.ts`, `track.ts`). Follow the stripe-cleaver file layout.
- Metadata: `title: "Engrave Merge"`, `robots: { index: false, follow: false }` (private dogfood). **Do not** add it to the public tool index, sitemap, or nav until the board approves launch. Whether to add an unlisted entry in `lib/apps.ts` is Eng Ops' call, as long as it isn't shown publicly.
- Back link at the top: `← All tools` → `/apps`. It is the shared tool bar (`components/HubChrome.tsx`, tap target ≥ 44 px); the page has no back link of its own.
- Read `node_modules/next/dist/docs/` first (repo AGENTS.md: "This is NOT the Next.js you know", Next 16.3.5 / React 19.2.8).
- Dependencies: a CSV parser that handles **quoted multi-line cells** (about half the rows in a public sample have newlines inside `Variations`). Use either `papaparse` or an in-repo RFC 4180 parser; the stripe-cleaver line-split approach is **not** enough. `opentype.js`, loaded with dynamic `import()` only when the seller adds a font. Nothing loads from a CDN.

## 3. Page layout (phone-first)

Hard requirements:
- On a **390 px wide** viewport, the **drop zone and the primary button sit fully inside the first 660 px** of the page (measured `getBoundingClientRect().bottom ≤ 660` at scrollY 0).
- **All text ≥ 16 px** computed (no 11 px eyebrows or `text-xs`/`text-sm` on this page), WCAG **AA** contrast everywhere (axe: zero `color-contrast` violations).
- **Exactly ONE black primary pill button** (`bg-[var(--cb-ink)]` #121410, explicit `text-white`, 18.5:1 contrast). Everything else is secondary (outline) or a text link.
- No jargon on the face: say "file", "problem list", "settings file", never "CSV parsing", "exceptions", "recipe JSON" or "fingerprint". The exact Etsy filename can appear in help text.

Copy marked `[COPY: …]` is a placeholder for **Product Copy**. The draft wording is a suggestion only.

```
┌──────────────────────── 390px ────────────────────────┐
│ ← All tools                                    (44px) │  16px link, 44px tap target
│ Engrave Merge                                  (40px) │  h1 28–32px
│ [COPY: Turn your Etsy orders file into a LightBurn    │  16px/24px, max 2 lines
│  merge file and a cut sheet.]                  (48px) │
│ [COPY: Your file stays on this device.]        (24px) │  16px, muted but AA (#5c5a54 on #f6f1ea = 6.1:1)
│ ┌───────────────────────────────────────────────────┐ │
│ │  Drop your Etsy "Order Items" file                │ │  drop zone, min-h 160px,
│ │  [COPY: or tap to choose it]                      │ │  whole box is a <label> for
│ │                                                   │ │  <input type=file accept=.csv>
│ └───────────────────────────────────────────────────┘ │
│ Where do I find this file? (text button, below box)   │
│ (( [COPY: Make merge file] ))                  (52px) │  ONE black pill, full width, white label
│ status line (aria-live=polite)                 (24px) │  e.g. File loaded. Tap "Make merge file" to get your LightBurn file.
└────────────────────── ≈ 470–520px ────────────────────┘  (budget 660px)
   below the fold (after a file is loaded):
   • summary (the ONLY count on screen): `{ready} ready for LightBurn · {held} need a look`, then
     "Items that need a look are left out of the merge file. The problem list says why." (or "Everything is ready." when held = 0).
     Unit = physical items, one per merge row (Quantity 3 = 3). ready = items in the merge file; held = items held out;
     ready + held = total items to make (duplicates dropped; "Which items" filter applied).
   • on-screen problem list (when held > 0): Item · How many (raw Quantity) · Problem
   • secondary buttons: Download problem list (hidden when held = 0)  [COPY: Print cut sheet]
   • "Which items" select: All items / one per listing (exports that listing only, rows renumbered from 1)
   • ▸ [COPY: Settings]  (disclosure, closed by default)
       - [COPY: Include orders already shipped]                 toggle, off
       - [COPY: Most letters per line] number, default 40 (0 = no limit)
       - [COPY: Split text into lines]                          toggle, on
       - [COPY: Number of line columns]                         number, default 6, range 1–10
       - [COPY: Remove "1. 2. 3." numbering]                    toggle, on
       - [COPY: Put items that need a look in the merge file anyway] toggle, off
       - [COPY: Check letters against my font (optional)]       file input .ttf/.otf
       - [COPY: Item settings]  per-listing mapping (§6.6)
       - [COPY: Save settings file] / [COPY: Load settings file]
   • ▸ [COPY: How to use this in LightBurn] (§7.4 guide, collapsed)
   • quiet text button: [COPY: I'd pay for unlimited batches]  → on tap: [COPY: Thanks, noted. No sign-up needed.]
   • [COPY: Try it with a sample file] text link (loads a bundled synthetic fixture; excluded from metrics)
```

Behaviour:
- Before a file is chosen, tapping the primary button opens the file picker (same as the drop zone). A disabled black button is not allowed because it would fail the "one clear action" rule.
- When a file is chosen it's parsed immediately (fires `file_processed`) and the status line updates. Tapping **Make merge file** downloads the merge file (fires `merge_downloaded`) and scrolls to the summary.
- Changing a setting re-runs the parse in memory. It does **not** re-fire `file_processed` unless a different file is loaded.
- Wrong file (missing required columns, §5.1): show a plain message in the status line, e.g. [COPY: This looks like Etsy's "Sold Orders" file. Please download "Order Items" instead.] Show it when `Full Name` is present and `Variations` is missing. No outputs.
- Mojibake guard: if the decoded text contains U+FFFD, show [COPY: Some letters look garbled. Download the file again from Etsy and don't open it in Excel first.] and still process.
- "Where do I find this file?" expands to: [COPY: In Etsy, go to Shop Manager → Settings → Options → Download Data. Pick "Order Items", choose the month, and tap Download CSV.] (**Product Copy to verify the current Etsy menu path.**)
- Desktop: same single column, `max-w-2xl`, centered.

## 4. Input

- Accepts `.csv`, UTF-8 (strip a leading BOM). Columns are matched **by header name**, never by position. Extra or unknown columns are ignored.
- Verified current header (33 columns, matches across 3 independent public sources, see §11):
  `Sale Date, Item Name, Buyer, Quantity, Price, Coupon Code, Coupon Details, Discount Amount, Shipping Discount, Order Shipping, Order Sales Tax, Item Total, Currency, Transaction ID, Listing ID, Date Paid, Date Shipped, Ship Name, Ship Address1, Ship Address2, Ship City, Ship State, Ship Zipcode, Ship Country, Order ID, Variations, Order Type, Listings Type, Payment Type, InPerson Discount, InPerson Location, VAT Paid by Buyer, SKU`
- The tool **reads** only: `Item Name, Quantity, Transaction ID, Listing ID, Order ID, Variations` (required) and `Buyer, Ship Name, Date Shipped, SKU` (optional; missing means blank). Address, price, tax and payment columns are never read into the outputs.
- Size: target ≤ 10,000 rows in under 1 s on a mid phone. A Web Worker is optional.

## 5. Parsing rules (normative; mirrored by `parse_reference.py`)

### 5.1 File checks
Required columns are missing → `WRONG_FILE`, no outputs (fixture `fx07_wrong_file_SoldOrders.csv`, reference exits 2).

### 5.2 Row filter
- Default: keep only rows where `Date Shipped` is blank after trimming. Toggle **Include orders already shipped** keeps every row. Hidden shipped rows are **not** problems. They only show up as a count in the summary.
- No date parsing is needed anywhere. Sale Date is `MM/DD/YY` and Date Paid/Shipped are `MM/DD/YYYY` in public samples, but nothing depends on that.

### 5.3 Text clean-up
- Decode HTML entities in `Variations` and `Item Name`: named, `&#NN;` and `&#xHH;` (public exports contain `&#39;` and `&amp;`). Use a pure function, not `innerHTML`.
- Normalize `\r\n` and `\r` to `\n`. "Flatten" means collapse every whitespace run (including newlines) to one space and trim.

### 5.4 Variations → label/value pairs
Variations is `Label:value` pairs joined by commas. Values can contain commas, colons and newlines. Algorithm:
1. Empty cell → no pairs (fine; a plain item).
2. Cell is exactly `Personalization` or `Personalisation` (no colon, seen in public test data) → one text pair with an empty value.
3. Cell must start with `Label:` where Label = 1–40 characters with no `,` `:` or newline. If it doesn't → **UNREADABLE_OPTIONS**.
4. Candidate boundaries are every `,` + optional spaces/tabs + `Label` + `:` (regex `,[ \t]*([^,:\n]{1,40}):`). Walk them left to right. A candidate starts a new pair only if:
   - the **current pair is a normal option** and the candidate label is one of: a KNOWN label (list in `parse_reference.py`, case-insensitive, whitespace-collapsed), a recipe label, a text label, **or** a *likely label* (starts with an uppercase letter, 1–5 words, ≤ 40 characters). Example: `Size:8 x 10 inches, framed,Style:Style 6` splits only at `,Style:`.
   - the **current pair is personalization text**: then the candidate must be another *text* label (`Personalization 2`, a recipe text field) or a recipe `extraLabels`/option label. Everything else stays inside the text. Example: `Personalization:Ace,Color:Blue please` gives text `Ace,Color:Blue please` (locked by fx03). Reason: in a 205-row public sample, Personalization was **the last pair 204/204 times**, and buyer text often contains "Word:".
5. Value = text between the label's colon and the next accepted boundary, trimmed (inner newlines kept). Display label = flattened label.
6. **Text labels** match `/^personali[sz]ation(\s*#?\s*\d+)?$/i`, plus any label the seller marks as engraving text in the recipe (`textFields`).
7. The value `Not requested on this item.` (any case, optional period) is Etsy's placeholder. Treat it as **blank**.

### 5.5 Personalization text and lines
- **Personalization** (merge column) = all non-blank text values in order (recipe `textFields` order if given, otherwise order of appearance), joined with a space, then flattened. **No newline ever goes into the merge file**, because LightBurn's handling of multi-line CSV cells is unverified.
- **Line 1…Line N** (when *Split text into lines* is on; N = line columns, default 6):
  - Several text fields (multi-field personalization) → one line per field, **slot kept** (field 2 is always Line 2, even if blank).
  - One field with newlines → one line per non-blank line. If every line starts with `1.`/`1)`, `2.`, … in sequence and *Remove numbering* is on, strip the markers.
  - One field, no newlines, with inline numbering `1. a 2. b 3. c` (≥ 2 markers, markers are 1–2 digits + `.` or `)` + whitespace, preceded by start or whitespace, sequence 1..k starting at position 0) → split at each marker and strip it. `est. 1970` doesn't trigger it.
  - Otherwise Line 1 = the whole text.
  - Lines beyond N → **TOO_MANY_LINES**.
- *Split* off → Line columns are present but blank (column positions never move).

### 5.6 Quantity
`Quantity` must be an integer ≥ 1. A row with Quantity N becomes **N merge rows**, `Copy` = `k of N`, all with the same text. Anything else (blank, 0, text) → **BAD_QUANTITY**, treated as 1 copy, held. (Future: "one name per copy" when Quantity = number of numbered lines. Out of scope for v1, see §12.)

### 5.7 First name
`Buyer` with a trailing `(username)` removed, then the first word. If `Buyer` is blank, use the first word of `Ship Name`. **Only the first name ever appears in any output.** Surnames, addresses and usernames are never written.

### 5.8 Sorting (all outputs)
Item Name (case-folded) → Listing ID (numeric) → Order ID (numeric) → Transaction ID (numeric) → original file order → copy number. Inside the problem list, a row's problems are listed in the code order of §6.3.

## 6. Outputs (exact layouts; bytes must match the golden files)

### 6.1 Encoding (both CSVs)
UTF-8 **without BOM**, CRLF line endings, minimal quoting (quote a field only if it contains `"` `,` CR or LF; double inner quotes). This is identical to Python `csv.writer(lineterminator="\r\n")`. Header row always present, even with zero data rows.

### 6.2 Merge file `engrave-merge-YYYY-MM-DD.csv` (local date)
Fixed column positions, so a LightBurn template keeps working batch after batch. Line columns are appended at the end, so changing N never moves `%0`–`%11`.

| LightBurn | Header | Content |
|---|---|---|
| %0 | Row | 1..R, equals the LightBurn row number (header = row 0) |
| %1 | Order ID | |
| %2 | First name | §5.7 |
| %3 | Listing ID | |
| %4 | Item | Item Name, decoded and flattened |
| %5 | SKU | |
| %6 | Copy | `1 of 3` |
| %7 | Option 1 | value only (e.g. `Walnut`) |
| %8 | Option 2 | |
| %9 | Option 3 | default: first 3 non-text pairs in order; recipe can pin labels to slots |
| %10 | Other options | the rest, `Label: value; Label: value` |
| %11 | Personalization | §5.5, single line |
| %12…%(11+N) | Line 1 … Line N | §5.5, default N = 6 → %12–%17 |

- Rows with any problem are **held out** by default (they still show on the cut sheet marked "held" and in the problem list). Toggle *Put items that need a look in the merge file anyway* includes them (DUPLICATE rows are always dropped).
- "Which items" = one listing → the same rules, but only that listing's rows, renumbered from 1 (golden case `fx01_simple__one_listing`).

### 6.3 Problem list `engrave-merge-exceptions-YYYY-MM-DD.csv`
Header: `Order ID, Transaction ID, Listing ID, Item, First name, Quantity, Problem, Problem code, Details, Personalization, Variations`. One row per (source row × problem). `Variations` = decoded raw cell with newlines shown as ` / `. `Quantity` = raw cell.

| Code (order) | Problem (on-screen words) | When | Details example |
|---|---|---|---|
| UNREADABLE_OPTIONS | Couldn't read the options for this item | §5.4 step 3 | Options don't start with a label like Size: |
| BAD_QUANTITY | Quantity looks wrong | §5.6 | Quantity is "0" |
| DUPLICATE | Same item appears twice in the file | same non-blank Transaction ID again (2nd+ copy dropped) | Transaction ID … appears more than once; kept the first |
| BLANK_TEXT | No personalization text | text is blank **and** (a text label exists with an empty value or the Etsy placeholder, **or** recipe `requiresPersonalization: true`, **or** the listing has ≥ 2 readable rows in the file and ≥ 50 % of them have text). Recipe `requiresPersonalization: false` turns this off. | Etsy says personalization was not requested / Personalization box was empty / Your settings say this item needs text / Most orders for this item have text; this one has none |
| TOO_LONG | Text is longer than your limit | any line (split on) or the whole text (split off) is longer than the limit (default 40; recipe per-listing `charLimit` overrides; 0 = off). Count = Unicode code points after NFC (`[...s.normalize('NFC')].length`) | Line 1 is 59 characters (limit 40) |
| TOO_MANY_LINES | More lines than your merge file has | lines > N | 8 lines; your merge file has 6 |
| EMOJI | Has an emoji your laser may not engrave | any char matching `/\p{Extended_Pictographic}/u` except © ® ™ | Emoji found: ❤ |
| MISSING_GLYPH | Your font is missing some letters | font uploaded and a text character (after NFC; ignoring whitespace, U+FE0E/FE0F/200D/20E3 and emoji) has no glyph (`font.charToGlyphIndex(ch) === 0`) | Missing from your font: ë |

Rows that are unreadable or duplicated skip the later checks. Blank-text rows skip the length, emoji and glyph checks.

### 6.4 Cut sheet (print view)
- Opens as an in-page print layout (or a new window built from a Blob) and calls `window.print()`. **No server render.** 16 px+ text, black on white, `break-inside: avoid` per item, one `<h2>` per listing with "(N to make)".
- Columns: ☐ Done · Merge row (`3`, `1-2`, `held`, `other file`) · Order · Name (first name) · Qty · Options (`Label: value`, or the raw cell if unreadable) · Text (multi-line kept, bold) with red "Check: <problem>" notes.
- Reference rendering: `fixtures/expected/*/sample_cutsheet.html` (illustrative; visual polish is Eng Ops' call. Not a byte-for-byte target.)

### 6.5 Fonts
TTF/OTF read with `opentype.js` `parse(arrayBuffer)`, entirely in memory, never uploaded or stored. Show the font name and how many letters are missing.

### 6.6 Settings file ("recipe"), downloaded and re-uploaded, never localStorage
`engrave-merge-settings.json`, schema (see `fixtures/recipe_fx06.json`):
```json
{ "tool": "engrave-merge", "recipeVersion": 1, "savedAt": "YYYY-MM-DD",
  "settings": { "includeShipped": false, "includeFlagged": false, "splitLines": true,
                "lineColumns": 6, "charLimit": 40, "stripNumbers": true },
  "extraLabels": ["Wood type"],
  "listings": { "<Listing ID>": { "itemName": "seller's listing title (display only)",
      "option1": "Color", "option2": null, "option3": null,
      "textFields": ["Baby name", "Birth date", "Weight"],
      "requiresPersonalization": true, "charLimit": 24 } } }
```
- "Item settings" UI: for each listing in the loaded file, show the labels found in its rows. The seller can mark each label as *engraving text* or *option*, pin Options 1–3, set "always needs text", and set a letter limit.
- The settings file holds **only** settings, labels, listing IDs and listing titles. It must never contain buyer names, text, order IDs or file content. Reject files without `tool: "engrave-merge"` or larger than 200 KB. Ignore unknown keys. Explicit on-screen changes override loaded settings.

## 7. LightBurn

### 7.1 Verified facts (LightBurn docs, Variable Text + Variable Text Formatting)
- Merge/CSV uses `%0`, `%1`… for **0-based columns**, and `Current`/`Start`/`End` count **0-based rows**. The header row is row 0, so **Start = 1**.
- `Advance By`, `Auto-Advance`, per-object `Offset` (Grid Array's "Auto-Increment Variable Text" checkbox increments it; checked against LightBurn 1.7.08), `Test`, `Bake`, `Max Width` / `Squeeze`, `Ignore Empty Vars`.
- LightBurn wants UTF-8 for special characters (we always write UTF-8).
- Warning from the docs: with Start ≠ 0 you must press **Reset** on the first run.

### 7.2 Unverified (tested by AT-21 in dogfood)
How multi-line quoted cells render (we avoid them), and whether a BOM would leak into `%0` of the header (we write no BOM).

### 7.3 Column cheat sheet (shown in app)
`%11` whole text · `%12` line 1 · `%13` line 2 · … · `%2` first name · `%7` option 1.

### 7.4 In-app guide (draft for Product Copy, ≤ 8 steps)
1. [COPY] In LightBurn, add a text box and type `%11` (whole text) or `%12`, `%13` … (one line each).
2. Set the text box's mode to **Merge/CSV** in the text toolbar.
3. Open **Window → Variable Text** (it opens as a tab behind Cuts / Layers), click **Browse** and pick your Engrave Merge file.
4. Set **Start = 1** (row 0 is the header), **End** = the last Row number on your cut sheet, then press **Reset**.
5. One item per run: **Advance By = 1** and turn on **Auto-Advance**. Each Start moves to the next item.
6. Several items per bed: lay them out with **Grid Array** with **Auto-Increment Variable Text** on (offsets 0, 1, 2, …), and set **Advance By** to how many fit (e.g. 4).
7. Press **Test** or use Preview to check names before burning. Set **Max Width** in the **Shape Properties** window so long names shrink to fit.
8. Tick items off on the printed cut sheet. The "Merge row" number matches LightBurn's **Current** value.

## 8. Tracking (outcome + kill bar from day 1, ZERO buyer data)

### 8.1 Rules
- Only the fields below are ever sent. **Never** file names, text, names, order/listing/transaction IDs, SKUs, item names, font names, or settings content.
- The client builds each payload from an allow-list. The server **re-validates** it and drops unknown keys and bad types: integers 0–100000, fingerprint `^[0-9a-f]{64}$`, iid `^(dog-)?[0-9a-f-]{36}$`. Body ≤ 1 KB. No IP or user-agent is stored by our code.
- Send with `navigator.sendBeacon('/api/engrave-merge/e', blob)` (same-origin, fire-and-forget). Failures are silent and never block the tool.
- localStorage holds exactly **one** key: `em_iid` = `crypto.randomUUID()`, created on first visit. No cookies, sessionStorage or IndexedDB from this tool.

### 8.2 Events

| event | props | fired when |
|---|---|---|
| `file_processed` | `row_count` (data rows in file), `item_count` (physical items after the shipped filter, held ones included, duplicates dropped), `exception_count` (problem-list rows), `file_fingerprint` or `small_file` | a new file is parsed (not on settings changes) |
| `merge_downloaded` | `file_fingerprint` or `small_file`, `merge_row_count` | primary button download |
| `exceptions_downloaded` | `file_fingerprint` or `small_file`, `exception_count` | problem list download |
| `cutsheet_printed` | `file_fingerprint` or `small_file` | Print cut sheet tapped |
| `pro_interest_tap` | none | "I'd pay for unlimited batches" tapped (once per page load; button then shows thanks) |
| `page_open` *(optional)* | none | page load: visits denominator |

**small_file** = `true`, sent **instead of** `file_fingerprint` when the file has fewer than 3 distinct Order IDs (a 1–2 order fingerprint could be brute-forced back to an Order ID). Every file event carries exactly one of the two.

Envelope: `{ v: 1, event, iid, dogfood: boolean, props }`. The server adds `ts` (server time) and `day` (America/New_York date) and keeps `host`.

**file_fingerprint** = lowercase hex SHA-256 (`crypto.subtle.digest`) of the **unique, trimmed, non-blank Order IDs sorted as strings and joined with `\n`**, computed over **all** rows (before the shipped filter), so toggles don't change it. It's used only to count distinct real files. Reference: `fingerprint()` in `parse_reference.py`. Fixture values: `fixtures/fixture_fingerprints.json`.

### 8.3 Excluding our own runs
1. Opening the page with `?dogfood=1` rewrites `em_iid` to `dog-<new uuid>` (still just a random id, so the localStorage rule holds). `?dogfood=0` gives a fresh non-dog id. Events from `dog-` ids get `dogfood: true`.
2. The server drops fingerprints listed in `fixture_fingerprints.json` (the sample-file button uses a fixture, so it's excluded automatically). Ship the list as ONE constant in `lib/engrave-merge/fixtures.ts`; the server event filter and `npm run engrave:kpis` both import it (no duplicate lists).
3. Analysis counts only `host === "alignata.com"`, which excludes previews and localhost.
4. Osbel and Eng Ops dogfood **only** with `?dogfood=1`.

### 8.4 Where events go (Eng Ops chooses; record the choice in the PR)
- **Fact:** Vercel Web Analytics custom events (`track()`) are **Pro/Enterprise only**, with **2 properties per event on Pro** (8 with Web Analytics Plus). The hub runs on **Hobby** (existing tools say "Hobby"). Hobby runtime logs are kept for **1 hour** (Pro 1 day). So "log to Vercel logs" **alone cannot** support a 14-day kill bar on Hobby.
- **Option A (recommended):** route handler `app/api/engrave-merge/e/route.ts` validates the event, then appends one JSON line to a **free KV**: Upstash Redis via the Vercel Marketplace, `RPUSH em:ev:<day>`, TTL 120 days. Plus `console.log` of the same line for live debugging.
- **Option B:** the same handler writes one tiny JSON object per event to **Vercel Blob** (`em-events/<day>/<ts>-<rand>.json`, private).
- **Option C:** Pro plan + `track()`. `file_processed` has 4 props, so it needs Web Analytics Plus or splitting. The dashboard can't do the per-install distinct-day maths, so a raw export would still be needed.
- **Required in every option:** `scripts/engrave-merge-kpis.mjs` (read-only) prints T0, the three kill-bar numbers and the weekly outcome metric from the stored events.

### 8.5 Outcome metric
**Weekly engaged sellers** = non-dogfood install ids with `merge_downloaded` on a real (non-fixture) fingerprint on **≥ 2 different America/New_York days** within the same Mon–Sun week. Reported weekly from day 1. Target: [BOARD: set target].

### 8.6 Kill bar (14 days)
Clock **T0** = server `ts` of the first `file_processed` that is real (non-dogfood, host alignata.com, fingerprint not a fixture). **A real small file (fewer than 3 orders, `small_file: true`) STARTS the clock (CEO rule).** Window [T0, T0 + 14 days). **Kill if ANY:**
1. **< 15** distinct real `file_fingerprint`s processed (small files do **not** count toward the 15), **OR**
2. **< 3** install ids that processed real files on **≥ 2 different days** with **≥ 2 different fingerprints** ("came back for a second batch on another day"), **OR**
3. **0** `pro_interest_tap` from non-dogfood ids. This stands in for paid signups/pre-orders while payments are deferred.

Caveat: an install id is a browser, not a seller. Cleared storage or a second device over-counts sellers, and that's accepted for dogfood.

## 9. Acceptance tests (Eng Ops must pass all before handing back)

**Parsing (golden)**
- AT-01: `scripts/assert-engrave-merge.mjs` (node:test, like `assert-stripe-cleaver.mjs`) runs `lib/engrave-merge` over **every case in `cases.json`** and compares merge and problem-list bytes with `expected/<case>/`. All 12 cases must match. Copy `fixtures/` into the repo (e.g. `public/fixtures/engrave-merge/`; all synthetic).
- AT-02: `fx07_wrong_file_SoldOrders.csv` → wrong-file message, no download offered.
- AT-03: A fixture saved with a UTF-8 BOM and with LF-only endings gives identical outputs.
- AT-04: The fingerprint of each fixture equals `fixture_fingerprints.json`.
- AT-05: The "Which items" filter on fx01 (listing 3000000001) gives exactly `expected/fx01_simple__one_listing/`.
- AT-06: Recipe round trip. Load fx06, mark `Baby name/Birth date/Weight` as text and Option 1 = Color, save the settings file, reload the page, load fx06 + that file → equals `fx06_multifield_GUESS__recipe`. The saved JSON contains none of the strings "Ima", "Fakename", "1000000", "01.02.2026".
- AT-07: Font check. Build `test-ascii.ttf` with `pyftsubset <any OFL font> --unicodes="U+0020-007E" --output-file=test-ascii.ttf` (commit with its OFL.txt). Load fx05 + that font → equals `fx05_exceptions__ascii_font`.

**Layout and accessibility (Playwright, 390×844, also 360×740)**
- AT-10: drop zone `bottom ≤ 660` and primary button `bottom ≤ 660` at scrollY 0.
- AT-11: every visible text node in `<main>` has computed font-size ≥ 16 px.
- AT-12: axe-core: 0 violations at serious/critical, 0 `color-contrast` violations (before and after a file is loaded).
- AT-13: exactly one element matches `[data-primary]`. Its computed background is rgb(18,20,16) and its color is rgb(255,255,255).
- AT-14: `← All tools` (shared tool bar) is present, links to `/apps`, and has a tap target ≥ 44 px.
- AT-15: keyboard-only: Tab reaches the drop zone input, the primary button and the settings. The status line is `aria-live`.
- AT-16: `robots` meta = `noindex,nofollow`. The page is not linked from the public index or sitemap.

**Privacy and tracking**
- AT-20: Playwright records **every** request after page load while processing fx05, downloading all 3 outputs and tapping pro interest. Assert: (a) no request URL or body contains any of `Fakename`, `Placeholder`, `Buyerson`, `Nowhereville`, `Grandpa`, `Zoë`, `1000000501`, `2000000501`, `3000000005`, `EM-TEST`, `fx05`; (b) the only non-static request is `POST /api/engrave-merge/e` (prefetch GETs from the shared header are fine); (c) every body's keys ⊆ the §8.2 allow-list; (d) `file_processed.props.file_fingerprint` = the fx05 value.
- AT-21: localStorage holds only `em_iid`. No cookies, sessionStorage or IndexedDB are written by the tool.
- AT-22: `?dogfood=1` → iid starts `dog-` and events carry `dogfood:true`. The server/KPI script excludes them. Fixture fingerprints are dropped.
- AT-23: The API rejects (400) unknown keys, strings in count fields, and bodies > 1 KB.
- AT-24: `scripts/engrave-merge-kpis.mjs` on a synthetic event log prints T0, the 3 kill-bar numbers and the weekly metric correctly (include the synthetic log as a test fixture).

**LightBurn (manual, during dogfood)**
- AT-30: Load `expected/fx03_multiline_commas/expected_merge.csv` in LightBurn with text `%12` / `%13` / `%14`, Start 1, End 5. Rows 2 and 3 show three separate lines. `Ima & Testy's Kitchen` renders correctly (ampersand and apostrophe decoded). Record the LightBurn version.

## 10. Out of scope (v1 dogfood)
Payments, checkout, accounts, email capture · Etsy API/OAuth connection · Amazon Custom, Shopify or other marketplaces · public launch, SEO, listing on the hub index · server-side processing or storage of files · auto-generating LightBurn `.lbrn` files · "one name per copy" splitting (Quantity N + N numbered lines) · images/photo personalization · non-UTF-8 (Windows-1252) imports beyond the garbled-text warning.

## 11. Format facts: what's verified and what isn't

**Verified (public sources, 2026-10-02):**
- 33-column header above. It matches exactly in (a) the header row of a public sample `EtsySoldOrderItems2025-1.csv` in `ddooxhuy09/Etsy-data-warehouse` (I read only the header and aggregate shapes; no buyer data copied), (b) the test fixture header in `peterdevpl/mercalc-app` (`__tests__/lib/import/etsyCsvImporter.test.ts`), and (c) the Coupler.io field list for the "Order Item CSV".
- Personalization lives inside `Variations` as `Label:value` pairs. In the 205-row public sample: about half the Variations cells contain newlines, values contain `:` (32 rows) and `,` (20 rows), Personalization was always the last pair (204/204), and HTML entities `&#39;` and `&amp;` appear raw in the cell. Seller-defined labels include multi-word/odd forms ("Color of name", "Size -  Material", "Frame Color &amp; Style").
- `Buyer` often looks like `Full Name (username)` (172/205 in the sample; also in mercalc test data). Sale Date is `MM/DD/YY`; Date Paid/Shipped are `MM/DD/YYYY`.
- A bare `Variations` value of `Personalization` (no colon) appears in mercalc test data.
- "Personalization: Not requested on this item." is Etsy's placeholder when the buyer couldn't or didn't enter text (seller reports; Make community).
- LightBurn Merge/CSV syntax and window controls (§7.1). Vercel plan facts (§8.4).
- c3ll256/etsy-helper-server parses Variations with an LLM prompt (no deterministic rules to borrow). Its prompt example confirms multi-line personalization containing commas.

**NOT verified (treat as open):**
- **The CSV shape of Etsy's 2026 multi-field personalization** (up to 5 named fields). fx06 is a **GUESS** covering 3 shapes: `Personalization 1:…`, seller-named fields (`Baby name:…`), and one box with typed sub-labels.
- Whether the public sample is a real export or generated (the repo also has a `generate_data/` folder). The header matches 2 other sources, but the "Personalization is last" statistic could be an artifact.
- Whether Etsy ever puts option pairs after Personalization.
- Whether `Buyer` can be a username only, and whether exports carry a BOM or CRLF inside cells.
- The exact `Sold Orders` header (fx07 uses the Coupler.io list).
- The current Etsy menu path to Download Data.
- How LightBurn handles multi-line cells and a BOM (§7.2).

## 12. Open risks
1. **Multi-field personalization shape unknown (highest risk).** Mitigations: the generic `Label:value` parser, text labels by regex plus seller-marked `textFields`, and the BLANK_TEXT majority rule, which catches "text went into options" (fx06 without a recipe flags that row). **Action:** the first dogfood seller using multi-field listings sends one redacted Variations cell, and we add it as fixture fx08.
2. **Delimiter ambiguity.** Buyer text containing `,Word:` after Personalization stays text (by design). An option value containing `, Capitalized words:` could split wrongly through the likely-label heuristic. Recipe `extraLabels` and the problem list are the safety net.
3. **Options after Personalization** would be swallowed into the text unless the label is in the recipe. That's covered by risk 1's action.
4. **Fingerprint privacy.** A file with a single order has a fingerprint that's SHA-256 of one 10-digit Order ID, which can be brute-forced back to that Order ID (not buyer identity, but still a file-derived value). Accept it for private dogfood, or have Eng Ops send only the first 32 hex characters. **Board/Osbel to confirm.**
5. **Install id ≠ seller** (devices, cleared storage), so kill-bar items 2 and 3 are approximate.
6. **Hobby plan limits** (no custom events, 1 h logs). The KV/Blob choice is required before launch to dogfood.
7. **Character counts** are code points, not visual width. Real fit depends on the font, so Max Width in LightBurn is the true guard.
8. **Encoding.** Files re-saved by Excel may not be UTF-8 (garbled-text warning only).
9. **Etsy header drift.** Columns are matched by name. Missing required columns fail loudly (wrong-file message), not silently.

## 13. Files in this package
- `SPEC.md`: this document.
- `fixtures/README.md`: what each fixture tests.
- `fixtures/fx01_simple.csv` … `fx06_multifield_GUESS.csv`, `fx07_wrong_file_SoldOrders.csv`: synthetic inputs (all names, addresses and IDs are fake).
- `fixtures/make_fixtures.py`: regenerates the fixture CSVs.
- `fixtures/parse_reference.py`: reference parser (stdlib Python; `--check` verifies all goldens; `--font` needs fontTools).
- `fixtures/cases.json`: case matrix. `fixtures/expected/<case>/expected_merge.csv`, `expected_exceptions.csv` (+ `sample_cutsheet.html` for 3 cases).
- `fixtures/recipe_fx06.json`: example settings file. `fixtures/font_charset_ascii.txt`: ASCII "font" stand-in for the reference check.
- `fixtures/fixture_fingerprints.json`: fingerprints to exclude from metrics.

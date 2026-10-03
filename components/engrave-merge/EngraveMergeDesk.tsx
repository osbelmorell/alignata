"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COPY } from "@/lib/engrave-merge/copy";
import { cutsheetHtml, printCutsheet } from "@/lib/engrave-merge/cutsheet";
import { fingerprintOf } from "@/lib/engrave-merge/fingerprint";
import { type LoadedFont, loadFont } from "@/lib/engrave-merge/glyphs";
import {
  downloadText,
  exceptionsCsv,
  exceptionsFileName,
  mergeCsv,
  mergeFileName,
} from "@/lib/engrave-merge/outputs";
import { process as runProcess } from "@/lib/engrave-merge/process";
import { summaryView } from "@/lib/engrave-merge/summary";
import { SummaryPanel } from "@/components/engrave-merge/SummaryPanel";
import { RECIPE_FILE_NAME, buildRecipe, parseRecipe } from "@/lib/engrave-merge/recipe";
import { fileRef, initGuideRef, initInstallId, sendEvent } from "@/lib/engrave-merge/track";
import {
  DEFAULT_SETTINGS,
  type ListingRecipe,
  type ProcessOk,
  type Recipe,
  type Settings,
} from "@/lib/engrave-merge/types";
import { PERS_LABEL_RE } from "@/lib/engrave-merge/variations";
import { normLabel } from "@/lib/engrave-merge/pytext";

const ALL_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
const SAMPLE_URL = "/fixtures/engrave-merge/sample.csv";

// Site styling primitives (Clay Board tokens). Every text size here is ≥ 16px.
const primaryBtn =
  "flex min-h-[52px] w-full items-center justify-center rounded-[var(--cb-radius-pill)] bg-[var(--cb-ink)] px-5 text-[18px] font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-ink)]";
const secondaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--cb-ink)] bg-[var(--cb-surface)] px-4 text-base font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-bg)]";
const textBtn =
  "inline-flex min-h-[44px] items-center text-base font-medium text-[var(--cb-ink)] underline underline-offset-4";
const fieldClass =
  "min-h-[44px] rounded-xl border border-[var(--cb-ink-muted)] bg-[var(--cb-surface)] px-3 text-base text-[var(--cb-ink)]";
const muted = "text-[var(--cb-ink-muted)]";
/** Number fields apply this long after typing stops (or at once on blur, so downloads use the latest value). */
const NUMBER_DEBOUNCE_MS = 400;
const UPDATED_FLASH_MS = 1500;

type Status = { kind: "idle" | "info" | "error"; text: string };

interface FileState {
  text: string;
  fingerprint: string | null;
  orderCount: number;
  /** Shown on screen only; never sent anywhere. */
  name: string;
}

export function EngraveMergeDesk() {
  const iidRef = useRef<string>("");
  const fileInput = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [file, setFile] = useState<FileState | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: COPY.statusIdle });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [listingCfg, setListingCfg] = useState<Record<string, ListingRecipe>>({});
  const [extraLabels, setExtraLabels] = useState<string[]>([]);
  const [listing, setListing] = useState<string>("");
  const [font, setFont] = useState<LoadedFont | null>(null);
  const [fontMsg, setFontMsg] = useState<string>("");
  /** Shown on the font button only; never sent anywhere. */
  const [fontFileName, setFontFileName] = useState<string>("");
  const [recipeMsg, setRecipeMsg] = useState<string>("");
  const [showWhere, setShowWhere] = useState(false);
  const [proTapped, setProTapped] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  /** Bumped by Start over: remounts the Settings drawer (collapsed, fresh number fields). */
  const [epoch, setEpoch] = useState(0);
  const updatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Stable callback ref: focus starts on Cancel when the Start over confirm appears (not on every re-render). */
  const focusOnMount = useCallback((el: HTMLButtonElement | null) => el?.focus(), []);

  useEffect(() => {
    iidRef.current = initInstallId(window.location.search);
    initGuideRef(window.location.search);
    sendEvent(iidRef.current, "page_open");
  }, []);
  useEffect(
    () => () => {
      if (updatedTimer.current) clearTimeout(updatedTimer.current);
    },
    [],
  );

  /**
   * A settings change re-runs the loaded file in place (the results are derived with useMemo
   * below). This only flashes "Updated" beside the count line. It sends NO event: only real
   * downloads count.
   */
  const markUpdated = () => {
    if (updatedTimer.current) clearTimeout(updatedTimer.current);
    setUpdated(true);
    updatedTimer.current = setTimeout(() => setUpdated(false), UPDATED_FLASH_MS);
  };

  const recipe: Recipe = useMemo(
    () => ({ tool: "engrave-merge", recipeVersion: 1, extraLabels, listings: listingCfg }),
    [extraLabels, listingCfg],
  );

  const result = useMemo(() => {
    if (!file) return null;
    return runProcess(file.text, {
      settings,
      explicit: ALL_KEYS,
      recipe,
      glyphCheck: font?.check ?? null,
      listing: listing || null,
    });
  }, [file, settings, recipe, font, listing]);

  const ok: ProcessOk | null = result && !result.error ? result : null;
  const view = ok ? summaryView(ok, settings.includeFlagged) : null;

  const missingLetters = useMemo(() => {
    if (!ok) return 0;
    const set = new Set<string>();
    for (const r of ok.excRows) {
      if (r[7] === "MISSING_GLYPH") r[8].replace(/^[^:]*:\s*/, "").split(" ").forEach((c) => c && set.add(c));
    }
    return set.size;
  }, [ok]);

  const loadText = useCallback(
    async (text: string, name: string) => {
      if (!text.trim()) {
        setFile(null);
        setStatus({ kind: "error", text: COPY.statusEmpty });
        return;
      }
      const res = runProcess(text, { settings, explicit: ALL_KEYS, recipe, glyphCheck: font?.check ?? null });
      if (res.error) {
        setFile({ text, fingerprint: null, orderCount: 0, name });
        setStatus({
          kind: "error",
          text: res.soldOrdersFile ? COPY.statusWrongSoldOrders : COPY.statusWrongOther(res.missing),
        });
        return;
      }
      const fingerprint = await fingerprintOf(res.orderIds);
      setFile({ text, fingerprint, orderCount: res.stats.order_count, name });
      setListing("");
      setStatus({ kind: "info", text: COPY.statusReady });
      sendEvent(iidRef.current, "file_processed", {
        row_count: res.stats.row_count,
        item_count: res.stats.item_count,
        exception_count: res.stats.exception_count,
        ...fileRef(fingerprint, res.stats.order_count),
      });
    },
    [settings, recipe, font],
  );

  const readFile = useCallback(
    (f: File | undefined | null) => {
      if (!f) return;
      setStatus({ kind: "info", text: COPY.statusReading });
      const reader = new FileReader();
      reader.onload = () => void loadText(String(reader.result ?? ""), f.name);
      reader.onerror = () => setStatus({ kind: "error", text: COPY.statusUnreadable });
      reader.readAsText(f, "utf-8");
    },
    [loadText],
  );

  const fileProps = () => (file?.fingerprint ? fileRef(file.fingerprint, file.orderCount) : { small_file: true as const });

  const onPrimary = () => {
    if (!ok) {
      fileInput.current?.click();
      return;
    }
    if (ok.stats.merge_row_count === 0) return; // nothing to make: never a header-only file (button is hidden anyway)
    downloadText(mergeFileName(), mergeCsv(ok));
    sendEvent(iidRef.current, "merge_downloaded", { ...fileProps(), merge_row_count: ok.stats.merge_row_count });
    setStatus({ kind: "info", text: COPY.statusDownloaded(ok.stats.ready_items) });
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onProblems = () => {
    if (!ok) return;
    downloadText(exceptionsFileName(), exceptionsCsv(ok));
    sendEvent(iidRef.current, "exceptions_downloaded", { ...fileProps(), exception_count: ok.stats.exception_count });
  };

  const onPrint = () => {
    if (!ok || ok.stats.merge_row_count === 0) return; // nothing to make: no cut sheet, no event (button is hidden)
    printCutsheet(cutsheetHtml(ok.cut, COPY.cutsheetTitle));
    sendEvent(iidRef.current, "cutsheet_printed", fileProps());
  };

  const onPro = () => {
    if (proTapped) return;
    setProTapped(true);
    sendEvent(iidRef.current, "pro_interest_tap");
  };

  const onSample = async () => {
    try {
      const res = await fetch(SAMPLE_URL);
      await loadText(await res.text(), SAMPLE_URL.split("/").pop() || "sample.csv");
    } catch {
      setStatus({ kind: "error", text: COPY.statusUnreadable });
    }
  };

  const onFont = async (f: File | undefined | null) => {
    if (!f) return;
    try {
      const loaded = await loadFont(await f.arrayBuffer());
      setFont(loaded);
      setFontFileName(f.name);
      setFontMsg("");
      markUpdated();
    } catch {
      setFont(null);
      setFontMsg(COPY.fontError);
    }
  };

  const onLoadRecipe = async (f: File | undefined | null) => {
    if (!f) return;
    const { recipe: r, error } = parseRecipe(await f.text(), f.size);
    if (!r) {
      setRecipeMsg(error === "too_big" ? COPY.settingsTooBig : COPY.settingsBad);
      return;
    }
    setSettings((s) => ({ ...s, ...(r.settings || {}) }));
    setListingCfg(r.listings || {});
    setExtraLabels(r.extraLabels || []);
    setRecipeMsg(COPY.settingsLoaded);
    markUpdated();
  };

  const onSaveRecipe = () => {
    const names = Object.fromEntries((ok?.listings || []).map((l) => [l.lid, l.itemName]));
    const withNames: Record<string, ListingRecipe> = {};
    for (const [lid, l] of Object.entries(listingCfg)) withNames[lid] = { ...l, itemName: l.itemName || names[lid] || "" };
    const body = JSON.stringify(buildRecipe(settings, withNames, extraLabels), null, 2) + "\n";
    downloadText(RECIPE_FILE_NAME, body, "application/json;charset=utf-8");
  };

  const setS = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    markUpdated();
  };
  const setL = (lid: string, patch: Partial<ListingRecipe>) => {
    setListingCfg((m) => ({ ...m, [lid]: { ...(m[lid] || {}), ...patch } }));
    markUpdated();
  };

  const toggleText = (lid: string, labels: string[], label: string, isText: boolean) => {
    const cur = listingCfg[lid]?.textFields || [];
    const set = new Set(cur.map(normLabel));
    if (isText) set.add(normLabel(label));
    else set.delete(normLabel(label));
    // keep the order the labels appear in the file
    const next = labels.filter((l) => set.has(normLabel(l)) && !PERS_LABEL_RE.test(normLabel(l)));
    setL(lid, { textFields: next });
  };

  /**
   * Start over: clears the file, results, all settings, the font file and the picker.
   * Keeps localStorage em_iid and sends no event. Then back to the top, drop zone focused.
   */
  const onStartOver = () => {
    if (updatedTimer.current) clearTimeout(updatedTimer.current);
    setFile(null);
    setStatus({ kind: "idle", text: COPY.statusIdle });
    setSettings(DEFAULT_SETTINGS);
    setListingCfg({});
    setExtraLabels([]);
    setListing("");
    setFont(null);
    setFontFileName("");
    setFontMsg("");
    setRecipeMsg("");
    setShowWhere(false);
    setUpdated(false);
    setConfirmReset(false);
    setEpoch((n) => n + 1);
    window.scrollTo({ top: 0, behavior: "auto" });
    fileInput.current?.focus({ preventScroll: true });
  };

  /** "Include shipped orders" button: exactly the Settings toggle (re-runs in place, flashes Updated, no event). */
  const onIncludeShipped = () => setS("includeShipped", true);

  /** Nothing to make (0 merge rows: both-zero, 0-ready pick, all-shipped listing pick): no Make merge file, no hint. */
  const nothingToMake = !!view && view.nothingToMake;
  /** ...and the hint's empty line takes no space. */
  const hideHint = nothingToMake && status.text === COPY.statusReady;

  // Settings changed from the standard ones: each main setting, the font file, extra labels and each item set up.
  const changedCount =
    ALL_KEYS.filter((k) => settings[k] !== DEFAULT_SETTINGS[k]).length +
    (font ? 1 : 0) +
    (extraLabels.length ? 1 : 0) +
    Object.values(listingCfg).filter((l) =>
      Object.entries(l).some(
        ([k, v]) => k !== "itemName" && v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
      ),
    ).length;

  return (
    <div className="mx-auto w-full max-w-2xl min-w-0 px-4 pb-16 pt-1 text-base text-[var(--cb-ink)]">
      <h1 className="mt-3 text-[30px] font-semibold leading-[40px] tracking-tight">{COPY.title}</h1>
      <p className="mt-1 text-base leading-6">{COPY.intro}</p>
      <p className={`text-base leading-6 ${muted}`}>{COPY.privacy}</p>

      {/* The whole dashed box is the file picker's label: every point of it opens the chooser. */}
      <label
        data-dropzone
        htmlFor="em-file"
        className={`mt-4 flex min-h-[160px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--cb-radius-card-sm)] border-2 border-dashed bg-[var(--cb-surface)] px-4 py-4 text-center focus-within:ring-2 focus-within:ring-[var(--cb-ink)] ${
          dragOver ? "border-[var(--cb-ink)]" : "border-[var(--cb-ink-muted)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          readFile(e.dataTransfer.files?.[0]);
        }}
      >
        <span className="text-[18px] font-semibold leading-6">{COPY.dropTitle}</span>
        <span className={`text-base [overflow-wrap:anywhere] ${muted}`}>
          {ok && file ? COPY.dropChosen(file.name, ok.stats.item_count) : COPY.dropSub}
        </span>
        <input
          id="em-file"
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            readFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <button type="button" className={textBtn} aria-expanded={showWhere} onClick={() => setShowWhere((v) => !v)}>
        {COPY.whereLink}
      </button>
      {showWhere && <p className="pb-2 text-base leading-6">{COPY.whereBody}</p>}

      <details
        key={epoch}
        data-settings
        className="mt-3 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-4"
      >
        <summary className="flex min-h-[48px] cursor-pointer items-center text-base font-semibold">
          <span data-settings-summary className="min-w-0 truncate">
            {COPY.settingsRow(changedCount)}
          </span>
        </summary>
        <div className="space-y-4 pb-4">
          <Check label={COPY.includeShipped} checked={settings.includeShipped} onChange={(v) => setS("includeShipped", v)} />
          <NumberField
            label={COPY.charLimit}
            value={String(settings.charLimit)}
            onCommit={(raw) => setS("charLimit", clamp(Number(raw) || 0, 0, 1000))}
          />
          <Check label={COPY.splitLines} checked={settings.splitLines} onChange={(v) => setS("splitLines", v)} />
          <NumberField
            label={COPY.lineColumns}
            value={String(settings.lineColumns)}
            onCommit={(raw) => setS("lineColumns", clamp(Number(raw) || 1, 1, 10))}
          />
          <Check label={COPY.stripNumbers} checked={settings.stripNumbers} onChange={(v) => setS("stripNumbers", v)} />
          <Check label={COPY.includeFlagged} checked={settings.includeFlagged} onChange={(v) => setS("includeFlagged", v)} />

          <div className="space-y-1">
            <label
              data-font-button
              className={`${secondaryBtn} w-full cursor-pointer focus-within:ring-2 focus-within:ring-[var(--cb-ink)]`}
            >
              <span className="min-w-0 truncate">{font && fontFileName ? fontFileName : COPY.fontCheck}</span>
              <input
                id="em-font"
                type="file"
                accept=".ttf,.otf"
                className="sr-only"
                onChange={(e) => {
                  void onFont(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {font && (
              <p className="text-base">
                {COPY.fontLoaded(font.name, missingLetters)}{" "}
                <button
                  type="button"
                  className={textBtn}
                  onClick={() => {
                    setFont(null);
                    setFontFileName("");
                    markUpdated();
                  }}
                >
                  {COPY.fontClear}
                </button>
              </p>
            )}
            {fontMsg && <p className="text-base text-[#8a1c1c]">{fontMsg}</p>}
          </div>

          <details data-item-settings className="rounded-xl border border-[var(--cb-line)] px-3">
            <summary className="flex min-h-[48px] cursor-pointer items-center text-base font-semibold">
              {COPY.itemSettings}
            </summary>
            <div className="space-y-3 pb-3">
              {!ok && <p className={`text-base ${muted}`}>{COPY.itemSettingsEmpty}</p>}
              {ok?.listings.map((l) => {
                const cfg = listingCfg[l.lid] || {};
                const textSet = new Set((cfg.textFields || []).map(normLabel));
                const optionLabels = l.labels.filter((x) => !PERS_LABEL_RE.test(normLabel(x)) && !textSet.has(normLabel(x)));
                return (
                  <fieldset key={l.lid} className="space-y-2 rounded-xl border border-[var(--cb-line)] p-3">
                    <legend className="px-1 text-base font-semibold">{COPY.whichOne(l.itemName, l.lid)}</legend>
                    {l.labels.map((label) => {
                      const always = PERS_LABEL_RE.test(normLabel(label));
                      return (
                        <label key={label} className="flex flex-col gap-1">
                          <span className="text-base">{COPY.labelKind(label)}</span>
                          <select
                            className={fieldClass}
                            disabled={always}
                            value={always || textSet.has(normLabel(label)) ? "text" : "option"}
                            onChange={(e) => toggleText(l.lid, l.labels, label, e.target.value === "text")}
                          >
                            <option value="option">{COPY.kindOption}</option>
                            <option value="text">{always ? COPY.kindAlwaysText : COPY.kindText}</option>
                          </select>
                        </label>
                      );
                    })}
                    {([1, 2, 3] as const).map((n) => {
                      const key = `option${n}` as "option1" | "option2" | "option3";
                      return (
                        <label key={key} className="flex flex-col gap-1">
                          <span className="text-base">{COPY.optionSlot(n)}</span>
                          <select
                            className={fieldClass}
                            value={cfg[key] || ""}
                            onChange={(e) => setL(l.lid, { [key]: e.target.value || null })}
                          >
                            <option value="">{COPY.optionAuto}</option>
                            {optionLabels.map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                    <Check
                      label={COPY.needsText}
                      checked={cfg.requiresPersonalization === true}
                      onChange={(v) => setL(l.lid, { requiresPersonalization: v ? true : undefined })}
                    />
                    <NumberField
                      label={COPY.itemLimit}
                      value={typeof cfg.charLimit === "number" ? String(cfg.charLimit) : ""}
                      wide
                      onCommit={(raw) =>
                        setL(l.lid, { charLimit: raw.trim() === "" ? undefined : clamp(Number(raw) || 0, 0, 1000) })
                      }
                    />
                  </fieldset>
                );
              })}
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={secondaryBtn} onClick={onSaveRecipe}>
              {COPY.saveSettings}
            </button>
            <label className={`${secondaryBtn} cursor-pointer focus-within:ring-2 focus-within:ring-[var(--cb-ink)]`}>
              {COPY.loadSettings}
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(e) => {
                  void onLoadRecipe(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {recipeMsg && <p className="text-base">{recipeMsg}</p>}
        </div>
      </details>

      {/* Nothing to make (0 merge rows): no Make merge file. */}
      {!nothingToMake && (
        <button type="button" data-primary className={`mt-4 ${primaryBtn}`} onClick={onPrimary}>
          {COPY.primary}
        </button>
      )}
      <p
        aria-live="polite"
        role="status"
        className={`mt-2 text-base leading-6 ${hideHint ? "" : "min-h-6"} ${status.kind === "error" ? "font-semibold text-[#8a1c1c]" : ""}`}
      >
        {/* Both-zero hides Make merge file, so don't tell the seller to tap it. */}
        {hideHint ? "" : status.text}
      </p>
      {ok?.garbled && <p className="mt-1 text-base font-semibold text-[#8a1c1c]">{COPY.garbled}</p>}

      {ok && view && (
        <SummaryPanel
          ref={summaryRef}
          view={view}
          updated={updated}
          listings={ok.listings}
          listing={listing}
          onListing={setListing}
          onProblems={onProblems}
          onPrint={onPrint}
          onIncludeShipped={onIncludeShipped}
        />
      )}


      <details className="mt-3 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-4">
        <summary className="flex min-h-[48px] cursor-pointer items-center text-base font-semibold">{COPY.guide}</summary>
        <ol className="list-decimal space-y-2 pb-3 pl-5 text-base leading-6">
          {COPY.guideSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className={`pb-4 text-base ${muted}`}>{COPY.cheatSheet}</p>
      </details>

      <div data-start-over-area className="mt-6 space-y-2">
        {confirmReset ? (
          <>
            <p className="text-base leading-6">{COPY.startOverWarn}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" data-start-over-yes className={secondaryBtn} onClick={onStartOver}>
                {COPY.startOverYes}
              </button>
              <button
                type="button"
                data-start-over-cancel
                className={secondaryBtn}
                ref={focusOnMount}
                onClick={() => setConfirmReset(false)}
              >
                {COPY.startOverCancel}
              </button>
            </div>
          </>
        ) : (
          <button type="button" data-start-over className={secondaryBtn} onClick={() => setConfirmReset(true)}>
            {COPY.startOver}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col items-start gap-1">
        {proTapped ? (
          <p className="min-h-[44px] py-2.5 text-base">{COPY.proThanks}</p>
        ) : (
          <button type="button" className={textBtn} onClick={onPro}>
            {COPY.proButton}
          </button>
        )}
        <button type="button" className={textBtn} onClick={() => void onSample()}>
          {COPY.sample}
        </button>
      </div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-base">
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-[var(--cb-ink)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Number input that commits NUMBER_DEBOUNCE_MS after typing stops, or at once on blur / Enter. */
function NumberField({
  label,
  value,
  wide = false,
  onCommit,
}: {
  label: string;
  value: string;
  wide?: boolean;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const commit = (raw: string | null) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (raw === null) return;
    setDraft(null);
    onCommit(raw);
  };
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        className={`${fieldClass} ${wide ? "" : "w-32"}`}
        value={draft ?? value}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(raw), NUMBER_DEBOUNCE_MS);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
        }}
      />
    </label>
  );
}

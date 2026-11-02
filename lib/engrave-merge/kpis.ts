/**
 * Engrave Merge kill-bar math (SPEC §8.5, §8.6). Shared by the CLI and
 * GET /api/engrave-merge/stats. Counts only — callers must not return raw events.
 *
 * Excluded everywhere: dogfood installs (dog- ids / dogfood:true), hosts other than
 * alignata.com, EXCLUDED_IIDS, and bundled fixture fingerprints.
 *
 * T0 = the first real file_processed, including a small file (small_file: true, no fingerprint).
 * Small files start the 14-day clock and do not count toward the 15 distinct real files.
 */
import { PROD_HOST } from "./events";
import { EXCLUDED_IIDS, isExcludedIid, isFixtureFingerprint } from "./fixtures";

const DAY_MS = 24 * 60 * 60 * 1000;
export const WINDOW_DAYS = 14;
/** Kill bar (SPEC §8.6). Item 3 is price_intent ("I'd pay $29"), not the legacy pro_interest_tap. */
export const BAR = { distinctRealFiles: 15, returningInstalls: 3, priceIntents: 1 } as const;

export { PROD_HOST };

type EventProps = Record<string, unknown> & { file_fingerprint?: unknown; small_file?: unknown };

type EventLike = {
  event?: string;
  iid?: string;
  dogfood?: boolean;
  host?: string;
  ts?: number;
  day?: string;
  props?: EventProps | null;
};

export type KpiReport = {
  t0: string | null;
  windowEnd: string | null;
  status: "NOT_STARTED" | "IN_WINDOW" | "KILL" | "PASS";
  killBar: { distinctRealFiles: number; returningInstalls: number; priceIntents: number };
  killIf: string[];
  priceIntentInstalls: number;
  priceCardViews: number;
  priceCardViewInstalls: number;
  priceIntentRate: number | null;
  smallFiles: number;
  installsBackOnAnotherDay: number;
  weeklyEngaged: Record<string, number>;
  ship: { multifieldFiles: number; nameSplitFiles: number; nameAmbiguousFiles: number; priceIntents: number };
  excluded: { dogfood: number; nonProdHost: number; fixture: number; excludedIid: number };
  totalEvents: number;
  realEvents: number;
};

export function parseLog(text: string): unknown[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => JSON.parse(l) as unknown);
}

const fpOf = (e: EventLike) => (e.props && typeof e.props.file_fingerprint === "string" ? e.props.file_fingerprint : null);

/** Monday (YYYY-MM-DD) of the Mon–Sun week containing an America/New_York day string. */
export function weekOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * DAY_MS).toISOString().slice(0, 10);
}

export function computeKpis(events: readonly unknown[], now = Date.now(), excludedIids: readonly string[] = EXCLUDED_IIDS): KpiReport {
  const excluded = { dogfood: 0, nonProdHost: 0, fixture: 0, excludedIid: 0 };
  const real: EventLike[] = [];
  for (const raw of events) {
    const e = raw as EventLike;
    if (e.dogfood === true || String(e.iid || "").startsWith("dog-")) excluded.dogfood++;
    else if (e.host !== PROD_HOST) excluded.nonProdHost++;
    else if (isExcludedIid(e.iid, excludedIids)) excluded.excludedIid++;
    else if (isFixtureFingerprint(fpOf(e))) excluded.fixture++;
    else real.push(e);
  }
  real.sort((a, b) => (a.ts as number) - (b.ts as number));
  // Any real file starts the clock, small files included (CEO rule).
  const firstFile = real.find((e) => e.event === "file_processed");
  const t0 = firstFile ? (firstFile.ts as number) : null;
  const end = t0 === null ? null : t0 + WINDOW_DAYS * DAY_MS;
  const inWin = t0 === null ? [] : real.filter((e) => (e.ts as number) >= t0 && (e.ts as number) < (end as number));

  const files = inWin.filter((e) => e.event === "file_processed");
  // Distinct real files = fingerprints only; small files never count here.
  const fps = new Set(files.map(fpOf).filter((fp): fp is string => !!fp));
  const smallFiles = files.filter((e) => e.props && e.props.small_file === true).length;

  const perIid = new Map<string, { days: Set<string>; fps: Set<string> }>();
  for (const e of files) {
    const fp = fpOf(e);
    if (!fp) continue;
    const id = e.iid as string;
    const s = perIid.get(id) || { days: new Set<string>(), fps: new Set<string>() };
    s.days.add(e.day as string);
    s.fps.add(fp);
    perIid.set(id, s);
  }
  const returningInstalls = [...perIid.values()].filter((s) => s.days.size >= 2 && s.fps.size >= 2).length;

  const anyDays = new Map<string, Set<string>>();
  for (const e of inWin) {
    const id = e.iid as string;
    const s = anyDays.get(id) || new Set<string>();
    s.add(e.day as string);
    anyDays.set(id, s);
  }
  const installsBackOnAnotherDay = [...anyDays.values()].filter((s) => s.size >= 2).length;

  const taps = inWin.filter((e) => e.event === "price_intent");
  const priceIntents = taps.length;
  const priceIntentInstalls = new Set(taps.map((e) => e.iid)).size;
  const views = inWin.filter((e) => e.event === "price_card_view");
  const priceCardViews = views.length;
  const priceCardViewInstalls = new Set(views.map((e) => e.iid)).size;
  // The card's rate: distinct installs that tapped "I'd pay" / distinct installs that saw the card.
  const priceIntentRate = priceCardViewInstalls ? priceIntentInstalls / priceCardViewInstalls : null;

  // Weekly engaged sellers (all real events, not only the kill-bar window)
  const wk = new Map<string, Map<string, Set<string>>>();
  for (const e of real) {
    if (e.event !== "merge_downloaded" || !fpOf(e)) continue;
    const w = weekOf(e.day as string);
    const id = e.iid as string;
    const m = wk.get(w) || new Map<string, Set<string>>();
    const s = m.get(id) || new Set<string>();
    s.add(e.day as string);
    m.set(id, s);
    wk.set(w, m);
  }
  const weeklyEngaged = Object.fromEntries(
    [...wk.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([w, m]) => [w, [...m.values()].filter((s) => s.size >= 2).length]),
  );

  // This ship's file-level counts (all real file_processed events, not only the original
  // 14-day window). Counts and price_intent only — never buyer text or field titles.
  const allFiles = real.filter((e) => e.event === "file_processed");
  const numProp = (e: EventLike, key: string) => (e.props && typeof e.props[key] === "number" ? e.props[key] : null);
  const ship = {
    multifieldFiles: allFiles.filter((e) => (numProp(e, "text_field_count") ?? 0) >= 2).length,
    nameSplitFiles: allFiles.filter((e) => numProp(e, "name_split") === 1).length,
    nameAmbiguousFiles: allFiles.filter((e) => numProp(e, "name_ambiguous") === 1).length,
    priceIntents: real.filter((e) => e.event === "price_intent").length,
  };

  const kill: string[] = [];
  if (t0 !== null) {
    if (fps.size < BAR.distinctRealFiles) kill.push(`distinct real files ${fps.size} < ${BAR.distinctRealFiles}`);
    if (returningInstalls < BAR.returningInstalls) kill.push(`returning installs ${returningInstalls} < ${BAR.returningInstalls}`);
    if (priceIntents < BAR.priceIntents) kill.push(`"I'd pay" taps (price_intent) ${priceIntents} = 0`);
  }
  const status = t0 === null ? "NOT_STARTED" : now < (end as number) ? "IN_WINDOW" : kill.length ? "KILL" : "PASS";

  return {
    t0: t0 === null ? null : new Date(t0).toISOString(),
    windowEnd: end === null ? null : new Date(end).toISOString(),
    status,
    killBar: { distinctRealFiles: fps.size, returningInstalls, priceIntents },
    killIf: kill,
    priceIntentInstalls,
    priceCardViews,
    priceCardViewInstalls,
    priceIntentRate,
    smallFiles,
    installsBackOnAnotherDay,
    weeklyEngaged,
    ship,
    excluded,
    totalEvents: events.length,
    realEvents: real.length,
  };
}

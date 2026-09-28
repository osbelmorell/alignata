import { maskValue, looksLikeSecret } from "./mask";
import { parseEnvBlob } from "./parse";
import type { DiffCounts, DiffRow, EnvDiffSnapshot } from "./types";

export function buildDiffSnapshot(opts: {
  beforeText: string;
  afterText: string;
  beforeLabel?: string;
  afterLabel?: string;
  now?: Date;
}): EnvDiffSnapshot {
  const beforeLabel = (opts.beforeLabel || "before").trim() || "before";
  const afterLabel = (opts.afterLabel || "after").trim() || "after";
  const now = opts.now ?? new Date();

  const before = parseEnvBlob(opts.beforeText);
  const after = parseEnvBlob(opts.afterText);
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)]),
  ).sort((a, b) => a.localeCompare(b));

  const rows: DiffRow[] = keys.map((key) => {
    const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
    const beforeValue = hasBefore ? before[key] : null;
    const afterValue = hasAfter ? after[key] : null;

    let category: DiffRow["category"];
    if (hasBefore && !hasAfter) category = "missing";
    else if (!hasBefore && hasAfter) category = "extra";
    else if (beforeValue !== afterValue) category = "changed";
    else category = "unchanged";

    // Secret-like from key name and/or either side's value shape
    const secretLike =
      looksLikeSecret(key, beforeValue) || looksLikeSecret(key, afterValue);

    return {
      key,
      beforeValue,
      afterValue,
      beforeMasked: maskValue(key, beforeValue),
      afterMasked: maskValue(key, afterValue),
      category,
      secretLike,
    };
  });

  const counts: DiffCounts = {
    missing: rows.filter((r) => r.category === "missing").length,
    extra: rows.filter((r) => r.category === "extra").length,
    changed: rows.filter((r) => r.category === "changed").length,
    unchanged: rows.filter((r) => r.category === "unchanged").length,
    secretLike: rows.filter((r) => r.secretLike).length,
    total: rows.length,
  };

  const summaryLine = `Env diff ${beforeLabel} → ${afterLabel}: ${counts.missing} missing, ${counts.extra} extra, ${counts.changed} changed, ${counts.secretLike} secret-like (${counts.total} keys)`;

  return {
    id: `env-diff-${now.getTime()}`,
    beforeLabel,
    afterLabel,
    generatedAt: now.toISOString(),
    counts,
    rows,
    summaryLine,
  };
}

/** Export-safe snapshot: never include raw secret values — masked only. */
export function sanitizeSnapshotForExport(
  snap: EnvDiffSnapshot,
): EnvDiffSnapshot {
  return {
    ...snap,
    rows: snap.rows.map((r) => ({
      key: r.key,
      beforeValue: null,
      afterValue: null,
      beforeMasked: r.beforeMasked,
      afterMasked: r.afterMasked,
      category: r.category,
      secretLike: r.secretLike,
    })),
  };
}

import type { Digest, DigestRow, ProjectBurn } from "./types";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Aggregate duplicate project names, sort by burn (deploys) desc, mark top burner(s). */
export function buildDigestRows(rows: ProjectBurn[]): DigestRow[] {
  const map = new Map<string, { deploys: number; gbHours: number }>();
  for (const r of rows) {
    const name = r.project.trim();
    if (!name) continue;
    const cur = map.get(name) || { deploys: 0, gbHours: 0 };
    cur.deploys += Number(r.deploys) || 0;
    cur.gbHours += Number(r.gbHours) || 0;
    map.set(name, cur);
  }

  const totalDeploys = Array.from(map.values()).reduce((s, v) => s + v.deploys, 0);
  const sorted = Array.from(map.entries())
    .map(([project, v]) => ({
      project,
      deploys: v.deploys,
      gbHours: v.gbHours,
      share: totalDeploys > 0 ? v.deploys / totalDeploys : 0,
      isTop: false,
    }))
    .sort((a, b) => b.deploys - a.deploys || a.project.localeCompare(b.project));

  if (sorted.length) {
    const top = sorted[0].deploys;
    for (const row of sorted) {
      row.isTop = row.deploys === top && top > 0;
    }
  }
  return sorted;
}

/** "This week api ate 62% of Hobby deploys (48/77); web second at 22%." */
export function weeklyOneLiner(rows: DigestRow[]): string {
  if (!rows.length) return "No Hobby deploy data yet — paste a CSV or load sample.";
  const total = rows.reduce((s, r) => s + r.deploys, 0);
  if (total <= 0) return "No deploys recorded this week.";

  const top = rows[0];
  const second = rows[1];
  let s = `This week ${top.project} ate ${pct(top.share)} of Hobby deploys (${top.deploys}/${total})`;
  if (second && second.deploys > 0) {
    s += `; ${second.project} second at ${pct(second.share)}.`;
  } else {
    s += ".";
  }
  return s;
}

export function makeDigest(rows: ProjectBurn[], label = "Weekly digest"): Digest {
  const digestRows = buildDigestRows(rows);
  const totalDeploys = digestRows.reduce((s, r) => s + r.deploys, 0);
  const totalGbHours = digestRows.reduce((s, r) => s + r.gbHours, 0);
  return {
    id: `d-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    label,
    rows: digestRows,
    totalDeploys,
    totalGbHours,
    oneLiner: weeklyOneLiner(digestRows),
  };
}

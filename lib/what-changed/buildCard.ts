import type {
  ChangeEvent,
  ConfigRow,
  Decision,
  DeployRow,
  FlagRow,
  TimeWindowPreset,
  UpstreamRow,
  WhatChangedCard,
} from "./types";

export function presetToRange(
  preset: TimeWindowPreset,
  customFrom?: string,
  customTo?: string,
  nowMs = Date.now(),
): { from: Date; to: Date; label: string } {
  const to = new Date(nowMs);
  if (preset === "custom") {
    const from = customFrom ? new Date(customFrom) : new Date(nowMs - 24 * 3600_000);
    const end = customTo ? new Date(customTo) : to;
    return {
      from,
      to: end,
      label: `${from.toISOString().slice(0, 16)} → ${end.toISOString().slice(0, 16)}`,
    };
  }
  const hours: Record<Exclude<TimeWindowPreset, "custom">, number> = {
    "1h": 1,
    "6h": 6,
    "24h": 24,
    "7d": 24 * 7,
  };
  const h = hours[preset];
  const from = new Date(nowMs - h * 3600_000);
  const labels: Record<Exclude<TimeWindowPreset, "custom">, string> = {
    "1h": "Last 1 hour",
    "6h": "Last 6 hours",
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
  };
  return { from, to, label: labels[preset] };
}

export function filterEvents(
  events: ChangeEvent[],
  service: string,
  from: Date,
  to: Date,
  kinds?: Array<"deploy" | "config" | "flag" | "upstream">,
): ChangeEvent[] {
  const svc = service.trim().toLowerCase();
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const kindSet = kinds && kinds.length ? new Set(kinds) : null;
  return events
    .filter((e) => e.service.toLowerCase() === svc)
    .filter((e) => {
      const t = Date.parse(e.ts);
      return !Number.isNaN(t) && t >= fromMs && t <= toMs;
    })
    .filter((e) => (kindSet ? kindSet.has(e.kind) : true))
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
}

function decide(events: ChangeEvent[]): Decision {
  const checks: string[] = [];
  const deploys = events.filter((e) => e.kind === "deploy");
  const configs = events.filter((e) => e.kind === "config");
  const flags = events.filter((e) => e.kind === "flag");
  const upstreams = events.filter((e) => e.kind === "upstream");

  const degraded = upstreams.filter((u) =>
    /degrad|down|outage|unhealthy|fail/i.test(`${u.status || ""} ${u.note || ""}`),
  );
  const prodDeploys = deploys.filter((d) =>
    /prod/i.test(d.env || "production"),
  );
  const aggressiveFlags = flags.filter((f) =>
    /100%|on\b|full/i.test(f.toState || ""),
  );

  if (degraded.length) {
    checks.push(
      `Confirm upstream recovery: ${degraded.map((d) => d.dependency).join(", ")}`,
    );
  }
  if (prodDeploys.length) {
    checks.push(
      `Verify prod deploys (${prodDeploys.map((d) => d.version || d.sha || "?").join(", ")}) against error budgets`,
    );
  }
  if (configs.length) {
    checks.push(
      `Spot-check config diffs: ${configs.map((c) => c.key).filter(Boolean).join(", ") || "keys changed"}`,
    );
  }
  if (aggressiveFlags.length) {
    checks.push(
      `Watch flag rollout: ${aggressiveFlags.map((f) => f.flag).join(", ")}`,
    );
  }
  if (!events.length) {
    return {
      verdict: "go",
      summary: "No changes in window — quiet period; proceed with normal ops.",
      checks: ["Confirm monitoring dashboards are green"],
    };
  }
  if (degraded.length && prodDeploys.length) {
    return {
      verdict: "no-go",
      summary:
        "Production deploy landed while an upstream is degraded — hold traffic-heavy work until dependency recovers.",
      checks,
    };
  }
  if (degraded.length || (prodDeploys.length >= 2 && flags.length)) {
    return {
      verdict: "verify",
      summary:
        "Meaningful change set in window. Verify health before treating the incident as closed.",
      checks: checks.length
        ? checks
        : ["Review recent deploys, flags, and dependency status"],
    };
  }
  if (prodDeploys.length || configs.length || flags.length) {
    return {
      verdict: "verify",
      summary:
        "Changes present — recommended go after a short verify pass on the items below.",
      checks: checks.length ? checks : ["Smoke-test critical paths for this service"],
    };
  }
  return {
    verdict: "go",
    summary: "Low-risk change set; no blockers from sample heuristic.",
    checks: checks.length ? checks : ["Keep an eye on SLOs for the next hour"],
  };
}

export function buildCard(opts: {
  service: string;
  events: ChangeEvent[];
  windowLabel: string;
  from: Date;
  to: Date;
  now?: Date;
  kinds?: Array<"deploy" | "config" | "flag" | "upstream">;
}): WhatChangedCard {
  const { service, events, windowLabel, from, to } = opts;
  const now = opts.now ?? new Date();
  const filtered = filterEvents(events, service, from, to, opts.kinds);

  const deploys: DeployRow[] = filtered
    .filter((e) => e.kind === "deploy")
    .map((e) => ({
      version: e.version,
      sha: e.sha,
      env: e.env,
      by: e.by,
      ts: e.ts,
    }));

  const config: ConfigRow[] = filtered
    .filter((e) => e.kind === "config")
    .map((e) => ({
      key: e.key || "(unknown)",
      oldValue: e.oldValue,
      newValue: e.newValue,
      ts: e.ts,
      by: e.by,
    }));

  const flags: FlagRow[] = filtered
    .filter((e) => e.kind === "flag")
    .map((e) => ({
      flag: e.flag || "(unknown)",
      fromState: e.fromState,
      toState: e.toState,
      ts: e.ts,
      by: e.by,
    }));

  const upstreams: UpstreamRow[] = filtered
    .filter((e) => e.kind === "upstream")
    .map((e) => ({
      dependency: e.dependency || "(unknown)",
      status: e.status,
      depVersion: e.depVersion,
      note: e.note,
      ts: e.ts,
    }));

  return {
    id: `card-${service}-${now.getTime()}`,
    service,
    windowLabel,
    from: from.toISOString(),
    to: to.toISOString(),
    generatedAt: now.toISOString(),
    deploys,
    config,
    flags,
    upstreams,
    decision: decide(filtered),
    eventCount: filtered.length,
  };
}

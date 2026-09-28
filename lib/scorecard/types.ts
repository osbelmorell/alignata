export type Status = "red" | "yellow" | "green";

export type PillarId = "linkedin" | "investment" | "build";

export interface Pillar {
  id: PillarId;
  name: string;
  status: Status;
  lastOutcome: string;
  updatedAt: string;
}

export interface ScorecardData {
  title: string;
  subtitle: string;
  pillars: Pillar[];
  updatedAt: string;
}

export const STORAGE_KEY = "enterprise-scorecard-v0";

export const DEFAULT_SCORECARD: ScorecardData = {
  title: "Bet A — Enterprise Scorecard",
  subtitle: "Board 1:1 snapshot · week ending Sep 20",
  updatedAt: "2026-09-20T21:51:00.000Z",
  pillars: [
    {
      id: "linkedin",
      name: "LinkedIn",
      status: "yellow",
      lastOutcome:
        "ADJUST — freeze / low-cadence (ban risk). No high-volume scrapes; reopen light after Mon Sep 21 ~3pm ET clear.",
      updatedAt: "2026-09-20T21:51:00.000Z",
    },
    {
      id: "investment",
      name: "Investment",
      status: "green",
      lastOutcome:
        "ON TRACK — powder hold default; Soft risk-on recommend-only size cards reopened.",
      updatedAt: "2026-09-20T21:51:00.000Z",
    },
    {
      id: "build",
      name: "Build",
      status: "green",
      lastOutcome:
        "ON TRACK — dogfood + monorepo migrate in flight (hub shell live; Scorecard on /scorecard).",
      updatedAt: "2026-09-20T21:51:00.000Z",
    },
  ],
};

export const STATUS_META: Record<
  Status,
  { label: string; dot: string; ring: string; bg: string; text: string }
> = {
  red: {
    label: "At risk",
    dot: "bg-[var(--cb-danger)]",
    ring: "ring-[color-mix(in_srgb,var(--cb-danger)_28%,transparent)]",
    bg: "bg-[color-mix(in_srgb,var(--cb-danger)_12%,white)]",
    text: "text-[var(--cb-clay-deep)]",
  },
  yellow: {
    label: "Watch",
    // Readable amber on clay paper (UX lock: red/yellow stay danger/amber)
    dot: "bg-amber-400",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
  },
  green: {
    label: "On track",
    // Lime signal only — badge, not card chrome
    dot: "bg-[var(--cb-olive-deep)]",
    ring: "ring-[color-mix(in_srgb,var(--cb-lime)_50%,transparent)]",
    bg: "bg-[var(--cb-lime)]",
    text: "text-[var(--cb-lime-ink)]",
  },
};

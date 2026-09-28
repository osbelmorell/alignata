import type { Severity } from "./types";

/** Deny list per board: GPL/AGPL/SSPL/Commons Clause (+ LGPL as GPL-family). */
const DENY_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bagpl[\s\-.]?v?\d*/i, label: "AGPL" },
  { re: /\blgpl[\s\-.]?v?\d*/i, label: "LGPL" },
  { re: /\bgpl[\s\-.]?v?\d*/i, label: "GPL" },
  { re: /\bsspl\b/i, label: "SSPL" },
  { re: /commons\s*clause/i, label: "Commons Clause" },
];

export function classifyLicense(license: string): {
  severity: Severity;
  reason: string;
} {
  const raw = (license || "").trim();
  if (!raw || raw.toLowerCase() === "unknown" || raw === "UNLICENSED") {
    return { severity: "unknown", reason: "license missing or unknown" };
  }
  for (const p of DENY_PATTERNS) {
    if (p.re.test(raw)) {
      return { severity: "deny", reason: `matches deny: ${p.label}` };
    }
  }
  const parts = raw.split(/\s+(?:OR|AND)\s+/i);
  if (parts.length > 1) {
    for (const part of parts) {
      for (const p of DENY_PATTERNS) {
        if (p.re.test(part)) {
          return { severity: "deny", reason: `matches deny: ${p.label}` };
        }
      }
    }
  }
  return { severity: "ok", reason: "allowed" };
}

export function normalizeLicenseField(raw: unknown): string {
  if (raw == null) return "unknown";
  if (typeof raw === "string") return raw.trim() || "unknown";
  if (Array.isArray(raw)) {
    return raw
      .map((x) => {
        if (typeof x === "string") return x;
        if (x && typeof x === "object" && "type" in x)
          return String((x as { type: unknown }).type);
        return "";
      })
      .filter(Boolean)
      .join(" OR ");
  }
  if (typeof raw === "object" && raw && "type" in raw) {
    return String((raw as { type: unknown }).type || "unknown");
  }
  return String(raw);
}

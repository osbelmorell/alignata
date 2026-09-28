export type LockFormat = "npm" | "pnpm" | "yarn" | "unknown";

export type Severity = "deny" | "unknown" | "ok";

export type LicenseHit = {
  package: string;
  version: string;
  license: string;
  severity: Severity;
  reason: string;
};

export type ScanResult = {
  format: LockFormat;
  status: "PASS" | "FAIL";
  packages: LicenseHit[];
  hits: LicenseHit[];
  scanned: number;
  unknown: number;
};

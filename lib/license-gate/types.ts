export type LicenseId = string;

export type GateVerdict = "pass" | "fail";

export type LicenseHit = {
  name: string;
  version: string;
  license: string;
  path?: string;
};

export type GateResult = {
  verdict: GateVerdict;
  hits: LicenseHit[];
  scanned: number;
  sourceLabel: string;
};

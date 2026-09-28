import { classifyLicense, normalizeLicenseField } from "./licenses";
import type { LicenseHit, LockFormat, ScanResult } from "./types";

function detectFormat(filename: string, text: string): LockFormat {
  const f = filename.toLowerCase();
  if (f.includes("package-lock") || f.endsWith(".json")) {
    try {
      const j = JSON.parse(text);
      if (j && (j.packages || j.dependencies) && (j.lockfileVersion != null || j.name))
        return "npm";
    } catch {
      /* fall through */
    }
  }
  if (f.includes("pnpm-lock") || (text.includes("lockfileVersion:") && text.includes("packages:")))
    return "pnpm";
  if (f.includes("yarn.lock") || /^# yarn lockfile/i.test(text) || text.includes("__metadata:"))
    return "yarn";
  if (text.trimStart().startsWith("{")) {
    try {
      const j = JSON.parse(text);
      if (j?.packages || j?.dependencies) return "npm";
    } catch {
      /* */
    }
  }
  if (/^lockfileVersion:\s*['"]?\d+/m.test(text)) return "pnpm";
  return "unknown";
}

function hit(name: string, version: string, license: string): LicenseHit {
  const { severity, reason } = classifyLicense(license);
  return { package: name, version, license, severity, reason };
}

function parseNpm(text: string): LicenseHit[] {
  const j = JSON.parse(text) as {
    packages?: Record<string, { version?: string; license?: unknown; name?: string }>;
    dependencies?: Record<string, { version?: string; license?: unknown }>;
  };
  const out: LicenseHit[] = [];
  if (j.packages && typeof j.packages === "object") {
    for (const [key, meta] of Object.entries(j.packages)) {
      if (!key || key === "") continue;
      const name =
        meta?.name ||
        key
          .replace(/^node_modules\//, "")
          .replace(/\/node_modules\//g, "/")
          .split("/node_modules/")
          .pop() ||
        key;
      const version = meta?.version || "";
      const license = normalizeLicenseField(meta?.license);
      out.push(hit(name, version, license));
    }
    return out;
  }
  if (j.dependencies) {
    for (const [name, meta] of Object.entries(j.dependencies)) {
      out.push(hit(name, meta?.version || "", normalizeLicenseField(meta?.license)));
    }
  }
  return out;
}

function parsePnpm(text: string): LicenseHit[] {
  const out: LicenseHit[] = [];
  const packagesIdx = text.search(/^packages:\s*$/m);
  const slice = packagesIdx >= 0 ? text.slice(packagesIdx) : text;
  const blockRe =
    /^ {2}('?\/?(@[^@\s]+\/[^@\s]+|[^@\s/]+)@[^':\s]+'?):\s*$/gm;
  let m: RegExpExecArray | null;
  const starts: { nameVer: string; index: number }[] = [];
  while ((m = blockRe.exec(slice))) {
    starts.push({ nameVer: m[1].replace(/^'|'$/g, ""), index: m.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : slice.length;
    const body = slice.slice(start.index, end);
    const licenseMatch = body.match(/^\s+license:\s*(.+)$/m);
    const license = licenseMatch
      ? licenseMatch[1].replace(/^['"]|['"]$/g, "").trim()
      : "unknown";
    const nv = start.nameVer.replace(/^\//, "");
    let name = nv;
    let version = "";
    const at = nv.lastIndexOf("@");
    if (at > 0) {
      name = nv.slice(0, at);
      version = nv.slice(at + 1);
    }
    out.push(hit(name, version, license));
  }
  return out;
}

function parseYarn(text: string): LicenseHit[] {
  const out: LicenseHit[] = [];
  const blockRe = /^"?((?:@[^@\s]+\/)?[^@\s"]+)@([^":\n]+)"?:\s*$/gm;
  let m: RegExpExecArray | null;
  const starts: { name: string; versionSpec: string; index: number }[] = [];
  while ((m = blockRe.exec(text))) {
    starts.push({ name: m[1], versionSpec: m[2], index: m.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const body = text.slice(start.index, end);
    const verMatch = body.match(/^\s+version\s+"?([^"\n]+)"?/m);
    const licenseMatch = body.match(/^\s+license:?\s*"?([^"\n]+)"?/m);
    const version =
      verMatch?.[1] || start.versionSpec.replace(/^npm:/, "").split(",")[0];
    const license = licenseMatch?.[1]?.trim() || "unknown";
    out.push(hit(start.name, version, license));
  }
  return out;
}

export function scanLockfile(text: string, filename = ""): ScanResult {
  const format = detectFormat(filename, text);
  let packages: LicenseHit[] = [];
  try {
    if (format === "npm") packages = parseNpm(text);
    else if (format === "pnpm") packages = parsePnpm(text);
    else if (format === "yarn") packages = parseYarn(text);
    else {
      try {
        packages = parseNpm(text);
      } catch {
        packages = parsePnpm(text);
      }
    }
  } catch (e) {
    return {
      format,
      status: "FAIL",
      packages: [],
      hits: [
        {
          package: "(parse-error)",
          version: "",
          license: "unknown",
          severity: "deny",
          reason: e instanceof Error ? e.message : "parse failed",
        },
      ],
      scanned: 0,
      unknown: 0,
    };
  }

  const seen = new Map<string, LicenseHit>();
  for (const p of packages) {
    const k = `${p.package}@${p.version}`;
    if (!seen.has(k)) seen.set(k, p);
  }
  const deduped = [...seen.values()];
  const hits = deduped.filter((p) => p.severity === "deny");
  const unknown = deduped.filter((p) => p.severity === "unknown").length;
  return {
    format,
    status: hits.length ? "FAIL" : "PASS",
    packages: deduped,
    hits,
    scanned: deduped.length,
    unknown,
  };
}

export function hitsToCsv(result: ScanResult): string {
  const esc = (v: string) => {
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const rows = result.packages.map((p) =>
    [p.package, p.version, p.license, p.severity].map(esc).join(","),
  );
  return ["package,version,license,severity", ...rows].join("\n") + "\n";
}

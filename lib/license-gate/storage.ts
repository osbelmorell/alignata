const KEY = "license-gate:v1";

type Store = {
  scanCount: number;
  failCount: number;
  rescanAfterFail: number;
  lastStatus: "PASS" | "FAIL" | null;
};

function empty(): Store {
  return { scanCount: 0, failCount: 0, rescanAfterFail: 0, lastStatus: null };
}

export function loadStore(): Store {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Store>;
    return {
      scanCount: Number(p.scanCount) || 0,
      failCount: Number(p.failCount) || 0,
      rescanAfterFail: Number(p.rescanAfterFail) || 0,
      lastStatus: p.lastStatus === "PASS" || p.lastStatus === "FAIL" ? p.lastStatus : null,
    };
  } catch {
    return empty();
  }
}

export function recordScan(status: "PASS" | "FAIL"): Store {
  const cur = loadStore();
  const next: Store = {
    scanCount: cur.scanCount + 1,
    failCount: cur.failCount + (status === "FAIL" ? 1 : 0),
    rescanAfterFail:
      cur.lastStatus === "FAIL" ? cur.rescanAfterFail + 1 : cur.rescanAfterFail,
    lastStatus: status,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}

/**
 * Browser storage left behind by retired tools, deleted on load (never written again).
 *
 * Env Diff Snapshot (/env-diff, retired Oct 3 2026): it kept the last pasted env text (which can hold secrets) and up to
 * 20 snapshots in plain form in localStorage, and its Clear button did not delete the pasted text. Every key it ever
 * wrote, from the full git history of app/env-diff, components/env-diff and lib/env-diff (`git log -p -S localStorage`):
 *   - localStorage "env-diff-snapshot:v0" (lib/env-diff/storage.ts `KEY`, added in 50ba8a6 on Sep 28 2026, the only key
 *     it ever used; holds snapshots, lastBefore/lastAfter pasted text and the two labels).
 *   - sessionStorage: none.
 * Product UI's HANDOFF-ENVDIFF.md §1 (from main @ bd87fd7) lists the same single key. The prefix sweep
 * "env-diff-snapshot:" (handoff §1) also removes any older or newer version of it, in localStorage and sessionStorage.
 * No other key uses that prefix; the site-wide keys (site_sid, site_vid, site_dogfood, site_articles, em_iid) are
 * never touched.
 */
export const RETIRED_STORAGE_KEYS = ["env-diff-snapshot:v0"] as const;
export const RETIRED_STORAGE_PREFIXES = ["env-diff-snapshot:"] as const;

type Store = Pick<Storage, "length" | "key" | "removeItem">;

function isRetired(key: string): boolean {
  return (RETIRED_STORAGE_KEYS as readonly string[]).includes(key) || RETIRED_STORAGE_PREFIXES.some((p) => key.startsWith(p));
}

/** Remove every retired key from one storage area. Returns the keys removed. Never throws. */
export function purgeRetiredKeys(store: Store | null | undefined): string[] {
  if (!store) return [];
  const found: string[] = [];
  try {
    for (const k of RETIRED_STORAGE_KEYS) found.push(k);
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k !== null && isRetired(k) && !found.includes(k)) found.push(k);
    }
  } catch {
    // storage not readable (privacy mode): still try the exact keys below
  }
  const removed: string[] = [];
  for (const k of found) {
    try {
      store.removeItem(k);
      removed.push(k);
    } catch {
      // ignore: nothing else to do for this key
    }
  }
  return removed;
}

function area(get: () => Storage): Storage | null {
  try {
    return get();
  } catch {
    return null; // window.localStorage itself can throw (blocked cookies / sandboxed frames)
  }
}

/** True when no retired key is left in a storage area we can read (false when the area can't be read or a key stuck). */
function clean(store: Store | null): boolean {
  if (!store) return false;
  try {
    for (const k of RETIRED_STORAGE_KEYS) if ((store as Storage).getItem?.(k) != null) return false;
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k !== null && isRetired(k)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Run on /env-diff, / and /apps load. One pass over the keys; writes nothing. Synchronous: when it returns, the wipe is
 * done. Returns true only if both localStorage and sessionStorage were readable and hold no retired key afterwards.
 */
export function cleanRetiredToolStorage(): boolean {
  if (typeof window === "undefined") return false;
  const local = area(() => window.localStorage);
  const session = area(() => window.sessionStorage);
  purgeRetiredKeys(local);
  purgeRetiredKeys(session);
  return clean(local) && clean(session);
}

/** The retired page's effect: wipe first (synchronously), then, only if it verifiably completed, reveal the line. */
export function wipeThenConfirm(wipe: () => boolean, reveal: (done: boolean) => void): void {
  const done = wipe();
  if (done) reveal(true);
}

/**
 * The same wipe as a blocking inline script, first in <head> (app/layout.tsx), so on a full load of the retired page
 * the data is gone before <body> is parsed (HANDOFF-ENVDIFF.md §1). It acts only on /env-diff; / and /apps run the
 * cleanup after hydration (RetiredStorageCleanup), and the retired page's dek still waits for its own wipe.
 */
export const RETIRED_WIPE_PATH = "/env-diff";
export const RETIRED_WIPE_INLINE_SCRIPT =
  `(function(){try{if(location.pathname.replace(/\\/+$/,"")!==${JSON.stringify(RETIRED_WIPE_PATH)})return;` +
  `var K=${JSON.stringify(RETIRED_STORAGE_KEYS)},P=${JSON.stringify(RETIRED_STORAGE_PREFIXES)};` +
  `var w=function(g){var s,f=K.slice(),i,k;try{s=g();}catch(e){return;}if(!s)return;` +
  `try{for(i=0;i<s.length;i++){k=s.key(i);if(k!==null&&f.indexOf(k)<0)for(var j=0;j<P.length;j++)if(k.indexOf(P[j])===0){f.push(k);break;}}}catch(e){}` +
  `for(i=0;i<f.length;i++){try{s.removeItem(f[i]);}catch(e){}}};` +
  `w(function(){return window.localStorage;});w(function(){return window.sessionStorage;});}catch(e){}})();`;

# WIP (parked 11:49 AM ET Oct 3 2026): price card seen/answer state in IndexedDB

Parked by CEO ruling 11:49 AM ET: a two-tab race may send at most 2 events, so 1fcca35 ships as is.
No code has been written yet. This note records the analysis and plan so the work can resume.

## Problem (Product QA, /workspace/phone-pass/company-pages-1fcca35/REPORT.md)
- Playwright WebKit, Web Locks ON: same-instant views sent 2 in 3/40 races, same-instant answers 2 in 2/40 (c6bf400: 5/44, 2/44).
- Cause (QA race diagnostic, cpp-racediag.tmp.mjs): tab B takes the "em_price" lock, writes today, releases; tab A gets the
  lock ~1 ms later and its localStorage read is still stale (WebKit hasn't synced B's write to A's process). Web Locks
  serialise the blocks, but localStorage is not a cross-process source of truth.

## Plan
1. New IDB store (e.g. db "alignata-em", store "price", one record "state") holding {seenDays, answer} (files/fps can stay
   in localStorage: counting is single-tab and not raced).
2. View block = ONE readwrite transaction: get state → if today in seenDays, abort/no-op → else put seenDays+today.
   Send price_card_view only in tx.oncomplete, and only if THIS transaction wrote today.
3. Answer block = ONE readwrite transaction: get → if answer set, no event, show stored state → else put answer;
   send price_intent / price_dismiss only in oncomplete when this tx wrote it.
4. Keep navigator.locks around it (harmless); correctness comes from IDB readwrite serialisation on one store.
5. IDB unavailable / open error / tx error → no card, no event (mirrors "storage blocked → no card").
   shouldShowCard becomes async (read IDB after the done scroll settles).
6. One-time migration: if IDB has no record and localStorage em_price has seenDays/answer, copy them into IDB inside the
   first readwrite tx, mark migrated; after that nothing reads localStorage for view/answer decisions.
7. Cross-tab swap: after an answer commits, post on BroadcastChannel("em_price") (fallback: a localStorage ping key used
   only as a notification); the receiver re-reads IDB, then applies showAnswer with the existing focus rule
   (shouldMoveFocus: card.contains(activeElement) read before the swap, preventScroll).
8. Tests: unit tests with fake-indexeddb (two "tabs" on one DB, same-instant → exactly 1 view / 1 answer; IDB error →
   no card/no event; migration); browser race loops QA-style (cpp-pc2 "views Promise.all", "views same instant",
   "pay vs No", "pay vs pay"), WebKit + Chromium, locks on and off, ≥200 tries each. Expected: always exactly 1.

## Privacy copy to review if this resumes (CEO decides; no copy change made)
- Privacy page (content/company.ts): "Engrave Merge also keeps a small note on this device: how many files you've dropped
  into it, which days it showed you the price question, and your answer if you gave one." It says "on this device",
  not "localStorage", so it stays true with IndexedDB.
- PRIVACY-FACTS.md (/workspace/alignata-company): Extra #4 and table row #3 (updated 10:30 AM ET) say em_price is in
  localStorage; they would need an IndexedDB note.

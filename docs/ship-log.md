# Alignata ship log

## Redesign before-baseline (alignata.fantasy.co redesign, SPEC v1.4)

- **Board GO:** Fri Oct 2, 2026, 2:56 PM ET. Condition: a 7-day before-baseline of pageviews and app opens per route
  runs before any visual change reaches production.
- **Baseline start:** the production READY time of the step-0 commit (the commit that adds this file). The exact
  time is in the step-0 report.
- **Baseline close:** baseline start + exactly 7 days (Fri Oct 9, 2026). No visual change ships to production before then.

### Step 0: tracking only, no visual change

- Vercel Web Analytics (`@vercel/analytics`, `<Analytics />` via `components/site/SiteTracker.tsx` in `app/layout.tsx`):
  pageviews per route. Automated browsers, the owner device and `?dogfood=1` sessions are dropped in `beforeSend`.
- First-party site events → `POST /api/site/e` → Upstash `site:ev:<America/New_York date>` (only the `site:` prefix;
  `em:*` and the other apps' keys are never touched). Allow-listed and re-validated on the server (body ≤ 1 KB;
  no IP, no user agent, no query strings stored). Response header `x-site-store`: stored | skipped-config | error.
  - `page_view {path}` on every route
  - `apps_view` on /apps
  - `tool_open {slug, position}` when an /apps card or its Open is tapped (sendBeacon / keepalive, no delay)
  - `article_view {slug, n}` on /daily-digest/<slug>; n = distinct articles viewed this session
  - every event carries `sid` (random, sessionStorage `site_sid`) and `vid` (random anonymous visitor,
    localStorage `site_vid`) and `dogfood`
- Not sent at all: `navigator.webdriver` browsers and the owner device (`em_iid` in EXCLUDED_IIDS).
  `?dogfood=1` sessions send with `dogfood: true` and are excluded by the baseline script.
- Read: `node scripts/site-baseline.mjs [--since ISO] [--until ISO] [--json]` (SCAN/LRANGE on `site:ev:*` only):
  views per route, /apps sessions, sessions with ≥1 tool_open, /apps → tool_open conversion, tool_open per card
  slug, weekly distinct Daily Digest readers, second-article rate. Dogfood and non-alignata.com hosts excluded.
- Engrave Merge KPIs stay on `em:*` (`npm run engrave:kpis`), unchanged.

## Redesign live (fantasy.co style, SPEC v1.4)

- **Baseline condition dropped:** the board dropped the 7-day before-baseline at 6:54 PM ET on Fri Oct 2, 2026, and
  ordered the redesign shipped that night, gated only on QA's Safari pass. Before-numbers therefore cover step 0
  (de2ef93, prod READY 3:25:35 PM ET) through the restyle below, about 3 hours 53 minutes, not 7 days.
- **Gates:** QA Safari PASS and Product Copy PASS on `da4eaef` (about 7:08 PM ET); Osbel's go in the GitHub 1:1.
- **Restyle live:** `main` fast-forwarded `63a78f8` → `da4eaef` at 7:18:08 PM ET. Production deploy
  `dpl_5U6DKupUuDgscox3nekELfi7L8aa` READY at **7:18:28 PM ET, Fri Oct 2, 2026**, on alignata.com and www.alignata.com.
  This is the restyle marker: every event before it is the old look, every event at or after it is the new look.
- **Kill clocks it lands inside** (the clocks keep running; the restyle date is logged so a read-back can split
  each window before/after this marker):
  - **Stripe Cleaver:** 14 days after ship. Kill if under 8 real import attempts or median time-to-download over 60s.
  - **License Gate:** its 14-day window from its soft-ship, as tracked by Product.
  - **Engrave Merge:** T0 = first real `file_processed` (SPEC §8.6), window [T0, T0 + 14 days). Listed on /apps
    since 1:21:04 PM ET Oct 2, so the whole restyle happens early in its window.
- **Tracking:** site events (`page_view`, `apps_view`, `tool_open`, `article_view`, `home_click`) and Engrave Merge's
  `em:*` events are unchanged by the restyle and now carry the after-numbers for the Monday read-back.

## v2 App Store layout + v3 sticker art live (SPEC v2)

- **What shipped:** the v2 App Store "Today" layout (feed, story cards, /apps rows, tool and article stories, sticky
  Open, motion) and the v3 sticker-art restyle for all tools and all 24 Daily Digest articles (`40256f5` … `3dce732`).
- **Restyle live:** `main` fast-forwarded to `3dce732` at 6:31 AM ET. Production deploy
  `dpl_7HYbYQbNQaHp8cLwQKB6P1EWXcFb` READY at **6:32:01 AM ET, Sat Oct 3, 2026**, on alignata.com and www.alignata.com.
  This is the second restyle marker: events between the 7:18:28 PM ET Oct 2 marker and this one are the v1.4 look,
  events at or after it are the v2 look.
- **Kill clocks it lands inside** (unchanged, still running; this date is logged only so a read-back can split each
  window before/after this marker):
  - **Stripe Cleaver:** 14 days after ship. Kill if under 8 real import attempts or median time-to-download over 60s.
  - **License Gate:** its 14-day window from its soft-ship, as tracked by Product.
  - **Engrave Merge:** T0 = first real `file_processed` (SPEC §8.6), window [T0, T0 + 14 days). Shutdown deadline
    unchanged.
- **Tracking:** site events and Engrave Merge's `em:*` events are unchanged by this restyle (story and sticky Opens
  send `tool_open` since `48773f3`). The `tool_open.source` field (feed / apps / story / sticky) is not in this
  deploy; it is on `preview/tracking-source` and has not shipped to production.

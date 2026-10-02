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

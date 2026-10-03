// Unit tests for the first-party site tracker (validator, article n count, ids, skips, handler, baseline summary).
import assert from "node:assert/strict";
import test from "node:test";
import { SITE_EVENT_OPTIONAL_PROPS, SITE_EVENT_PROPS, TOOL_OPEN_SOURCES, validateSiteEvent } from "../lib/site/events.ts";
import {
  ARTICLES_KEY,
  DOGFOOD_KEY,
  DOGFOOD_LINKS,
  articleSlug,
  dogfoodHref,
  dogfoodSession,
  getOrCreateId,
  homeClickTarget,
  noteArticle,
  randomId,
  routeEvents,
  sendSiteEvent,
  shouldSkip,
  toolOpenPage,
  toolOpenSource,
  trackToolOpen,
} from "../lib/site/client.ts";
import { handleSiteEvent } from "../lib/site/handler.ts";
import { SITE_EVENT_KEY_MATCH, SITE_KEY_PREFIX, siteEventKey } from "../lib/site/store.ts";
import { readStore, summarize, weekOf } from "./site-baseline.mjs";

const SID = "0b7f2a54-1c1e-4b1a-9d8e-2f3a4b5c6d7e";
const VID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const OWNER = "55ac19e0-0d84-445a-8b0f-d4d4357bd965";
const env = (event, props, extra = {}) => ({ v: 1, event, sid: SID, vid: VID, dogfood: false, props, ...extra });
const mem = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};

test("validator: the five allow-listed events with exactly their props", () => {
  assert.deepEqual(Object.keys(SITE_EVENT_PROPS), ["page_view", "apps_view", "tool_open", "article_view", "home_click"]);
  for (const [ev, props] of [
    ["page_view", { path: "/" }],
    ["page_view", { path: "/daily-digest/break-loops-when-progress-stalls" }],
    ["apps_view", {}],
    ["tool_open", { slug: "engrave-merge", position: 11 }],
    ["article_view", { slug: "break-loops-when-progress-stalls", n: 2 }],
    ["home_click", { target: "tools-pill" }],
    ["home_click", { target: "digest-pill" }],
    ["home_click", { target: "all-tools" }],
    ["home_click", { target: "all-articles" }],
    ["home_click", { target: "tool:engrave-merge" }],
    ["home_click", { target: "article:break-loops-when-progress-stalls" }],
    ["home_click", { target: "nav:daily-digest" }],
  ]) {
    const v = validateSiteEvent(env(ev, props));
    assert.equal(v.ok, true, `${ev} ${JSON.stringify(props)}`);
    assert.deepEqual(v.event.props, props);
  }
  assert.equal(validateSiteEvent({ v: 1, event: "apps_view", sid: SID, vid: VID, dogfood: true }).ok, true, "props optional when empty");
});

test("validator: rejects unknown keys, missing/extra props, bad ids and bad values", () => {
  const bad = [
    [env("page_view", { path: "/" }, { ip: "1.2.3.4" }), "unknown_key:ip"],
    [env("page_view", { path: "/" }, { ua: "x" }), "unknown_key:ua"],
    [env("click", {}), "bad_event"],
    [{ ...env("page_view", { path: "/" }), v: 2 }, "bad_v"],
    [{ ...env("page_view", { path: "/" }), sid: "abc" }, "bad_sid"],
    [{ ...env("page_view", { path: "/" }), vid: OWNER.toUpperCase() }, "bad_vid"],
    [{ ...env("page_view", { path: "/" }), vid: undefined }, "bad_vid"],
    [{ ...env("page_view", { path: "/" }), dogfood: "yes" }, "bad_dogfood"],
    [env("page_view", {}), "missing_prop:path"],
    [env("page_view", { path: "/apps", slug: "x" }), "unknown_prop:slug"],
    [env("page_view", { path: "/apps?email=a@b.c" }), "bad_path"],
    [env("page_view", { path: "/apps#x" }), "bad_path"],
    [env("page_view", { path: "apps" }), "bad_path"],
    [env("page_view", { path: "//evil.com" }), "bad_path"],
    [env("page_view", { path: "/" + "a".repeat(200) }), "bad_path"],
    [env("apps_view", { path: "/apps" }), "unknown_prop:path"],
    [env("tool_open", { slug: "engrave-merge" }), "missing_prop:position"],
    [env("tool_open", { slug: "Engrave Merge", position: 1 }), "bad_slug"],
    [env("tool_open", { slug: "engrave-merge", position: 0 }), "bad_position"],
    [env("tool_open", { slug: "engrave-merge", position: 1.5 }), "bad_position"],
    [env("tool_open", { slug: "engrave-merge", position: "1" }), "bad_position"],
    [env("article_view", { slug: "x", n: 0 }), "bad_n"],
    [env("article_view", { slug: "x", n: 10001 }), "bad_n"],
    [env("article_view", { slug: "x" }), "missing_prop:n"],
    [env("article_view", { slug: "x", n: 1, title: "t" }), "unknown_prop:title"],
    [[1, 2], "not_object"],
    [{ ...env("apps_view", {}), props: [] }, "bad_props"],
  ];
  for (const [raw, reason] of bad) assert.deepEqual(validateSiteEvent(raw), { ok: false, reason }, JSON.stringify(raw));
});

test("article n: distinct articles this session; re-views do not raise n; storage errors → 1", () => {
  const s = mem();
  assert.equal(noteArticle(s, "a"), 1);
  assert.equal(noteArticle(s, "a"), 1, "same article again");
  assert.equal(noteArticle(s, "b"), 2);
  assert.equal(noteArticle(s, "a"), 2);
  assert.equal(noteArticle(s, "c"), 3);
  assert.deepEqual(JSON.parse(s.getItem(ARTICLES_KEY)), ["a", "b", "c"]);
  assert.equal(noteArticle(mem({ [ARTICLES_KEY]: "not json" }), "z"), 1, "corrupt value resets");
  assert.equal(noteArticle(mem({ [ARTICLES_KEY]: '{"a":1}' }), "z"), 1);
  const throwing = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() {} };
  assert.equal(noteArticle(throwing, "a"), 1);
  assert.equal(noteArticle(null, "a"), 1);
  // a new session (fresh sessionStorage) starts again at 1
  assert.equal(noteArticle(mem(), "b"), 1);
});

test("routeEvents: page_view everywhere, apps_view on /apps, article_view {slug, n} on an article only", () => {
  const s = mem();
  assert.deepEqual(routeEvents("/", s), [{ event: "page_view", props: { path: "/" } }]);
  assert.deepEqual(routeEvents("/apps", s), [{ event: "page_view", props: { path: "/apps" } }, { event: "apps_view", props: {} }]);
  assert.deepEqual(routeEvents("/daily-digest", s), [{ event: "page_view", props: { path: "/daily-digest" } }]);
  assert.deepEqual(routeEvents("/daily-digest/break-loops-when-progress-stalls", s)[1], { event: "article_view", props: { slug: "break-loops-when-progress-stalls", n: 1 } });
  assert.deepEqual(routeEvents("/daily-digest/ask-before-doing-what-wasnt-asked", s)[1].props.n, 2);
  assert.deepEqual(routeEvents("/engrave-merge", s), [{ event: "page_view", props: { path: "/engrave-merge" } }]);
  assert.equal(articleSlug("/daily-digest/rss.xml"), null);
  assert.equal(articleSlug("/daily-digest/a/b"), null);
  for (const path of ["/", "/apps", "/engrave-merge", "/daily-digest", "/daily-digest/break-loops-when-progress-stalls"]) {
    for (const e of routeEvents(path, mem())) assert.equal(validateSiteEvent(env(e.event, e.props)).ok, true, `${path} ${e.event} validates`);
  }
});

test("ids: sid/vid are UUIDs, created once and reused; bad stored values are replaced", () => {
  const id = randomId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(randomId({ getRandomValues: (b) => b.fill(7) }), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, "fallback without randomUUID");
  const s = mem();
  const a = getOrCreateId(s, "site_vid");
  assert.equal(getOrCreateId(s, "site_vid"), a);
  assert.notEqual(getOrCreateId(mem({ site_vid: "hello" }), "site_vid"), "hello");
  assert.match(getOrCreateId(null, "site_sid"), /^[0-9a-f-]{36}$/);
});

test("skips: navigator.webdriver and the owner device (em_iid in EXCLUDED_IIDS) never send", () => {
  assert.equal(shouldSkip({ webdriver: true, local: mem() }), true);
  assert.equal(shouldSkip({ webdriver: false, local: mem({ em_iid: OWNER }) }), true);
  assert.equal(shouldSkip({ webdriver: false, local: mem({ em_iid: "11111111-2222-4333-8444-555555555555" }) }), false);
  assert.equal(shouldSkip({ webdriver: false, local: mem() }), false);
  assert.equal(shouldSkip({ webdriver: false, local: null }), false);
});

test("dogfood: ?dogfood=1 marks the whole session, ?dogfood=0 clears it", () => {
  const s = mem();
  assert.equal(dogfoodSession("", s), false);
  assert.equal(dogfoodSession("?dogfood=1", s), true);
  assert.equal(s.getItem(DOGFOOD_KEY), "1");
  assert.equal(dogfoodSession("", s), true, "later pages in the session stay dogfood");
  assert.equal(dogfoodSession("?dogfood=0", s), false);
  assert.equal(dogfoodSession("", s), false);
});

test("dogfood tool links: same-origin links get ?dogfood=1; external, bad or already-marked links are left alone", () => {
  const O = "https://alignata.com";
  assert.equal(dogfoodHref("/engrave-merge", O), "/engrave-merge?dogfood=1");
  assert.equal(dogfoodHref("/stripe-cleaver?x=2#top", O), "/stripe-cleaver?x=2&dogfood=1#top");
  assert.equal(dogfoodHref("https://alignata.com/scorecard", O), "/scorecard?dogfood=1");
  assert.equal(dogfoodHref("/license-gate?dogfood=0", O), "/license-gate?dogfood=1", "a stale ?dogfood=0 is flipped");
  assert.equal(dogfoodHref("/engrave-merge?dogfood=1", O), null);
  assert.equal(dogfoodHref("https://example.com/tool", O), null);
  assert.equal(dogfoodHref("//example.com/tool", O), null);
  assert.equal(dogfoodHref("http://[bad", O), null);
});

test("handler: 204 + x-site-store, ≤ 1 KB, writes only site:ev:<ET day>, stores no IP/UA", async () => {
  assert.equal(SITE_KEY_PREFIX, "site:");
  assert.equal(siteEventKey("2026-10-02"), "site:ev:2026-10-02");
  assert.equal(SITE_EVENT_KEY_MATCH, "site:ev:*");
  const post = (body, headers = {}) =>
    handleSiteEvent(new Request("https://alignata.com/api/site/e", { method: "POST", body, headers: { "content-type": "application/json", "user-agent": "UA-SECRET", "x-forwarded-for": "203.0.113.9", ...headers } }));
  const saved = { ...process.env };
  const origFetch = globalThis.fetch;
  try {
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
    let r = await post(JSON.stringify(env("page_view", { path: "/" })));
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("x-site-store"), "skipped-config");
    assert.equal((await post("nope")).status, 400);
    assert.equal((await post(JSON.stringify(env("page_view", { path: "/" }, { pad: "x".repeat(1100) })))).status, 400);
    const big = await post(JSON.stringify({ ...env("page_view", { path: "/" }), x: "y".repeat(1100) }));
    assert.equal(big.status, 400);
    assert.equal((await big.json()).reason, "too_large");
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "t";
    const calls = [];
    globalThis.fetch = async (u, o) => (calls.push({ u, body: JSON.parse(o.body) }), new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), { status: 200 }));
    for (const [ev, props] of [["page_view", { path: "/apps" }], ["apps_view", {}], ["tool_open", { slug: "engrave-merge", position: 11 }], ["article_view", { slug: "a", n: 2 }]]) {
      r = await post(JSON.stringify(env(ev, props, { dogfood: true })));
      assert.equal(r.status, 204);
      assert.equal(r.headers.get("x-site-store"), "stored", ev);
      assert.equal(await r.text(), "");
    }
    assert.equal(calls.length, 4);
    for (const c of calls) {
      assert.equal(c.u, "https://kv.example/pipeline");
      const [[cmd, key, line], [exp, key2]] = c.body;
      assert.equal(cmd, "RPUSH"); assert.equal(exp, "EXPIRE");
      assert.match(key, /^site:ev:\d{4}-\d{2}-\d{2}$/); assert.equal(key2, key);
      const rec = JSON.parse(line);
      assert.deepEqual(Object.keys(rec).sort(), ["day", "dogfood", "event", "host", "prod", "props", "sid", "ts", "v", "vid"]);
      assert.equal(rec.prod, true); assert.equal(rec.dogfood, true);
      assert.ok(!line.includes("UA-SECRET") && !line.includes("203.0.113.9"), "no UA / IP stored");
    }
    globalThis.fetch = async () => new Response("{}", { status: 500 });
    assert.equal((await post(JSON.stringify(env("apps_view", {})))).headers.get("x-site-store"), "error");
    globalThis.fetch = async () => { throw new Error("down"); };
    assert.equal((await post(JSON.stringify(env("apps_view", {})))).headers.get("x-site-store"), "error");
  } finally {
    globalThis.fetch = origFetch;
    process.env = saved;
  }
});

test("baseline summary: routes, /apps → tool_open per session, per-slug, distinct readers, second-article rate", () => {
  const T = Date.parse("2026-10-02T19:30:00Z");
  const ev = (event, sid, vid, props = {}, extra = {}) => ({ v: 1, event, sid, vid, dogfood: false, props, ts: T, day: "2026-10-02", host: "alignata.com", prod: true, ...extra });
  const [s1, s2, s3, s4] = ["s1", "s2", "s3", "s4"];
  const events = [
    ev("page_view", s1, "v1", { path: "/apps" }), ev("apps_view", s1, "v1"), ev("tool_open", s1, "v1", { slug: "engrave-merge", position: 11 }), ev("tool_open", s1, "v1", { slug: "stripe-cleaver", position: 9 }),
    ev("page_view", s2, "v2", { path: "/apps" }), ev("apps_view", s2, "v2"),
    ev("page_view", s2, "v2", { path: "/daily-digest/a" }), ev("article_view", s2, "v2", { slug: "a", n: 1 }),
    ev("page_view", s3, "v1", { path: "/daily-digest/a" }), ev("article_view", s3, "v1", { slug: "a", n: 1 }),
    ev("page_view", s3, "v1", { path: "/daily-digest/b" }), ev("article_view", s3, "v1", { slug: "b", n: 2 }),
    ev("page_view", s4, "v3", { path: "/" }),
    ev("page_view", "d", "vd", { path: "/apps" }, { dogfood: true }), ev("tool_open", "d", "vd", { slug: "engrave-merge", position: 11 }, { dogfood: true }),
    ev("page_view", "p", "vp", { path: "/" }, { host: "alignata-git-main.vercel.app", prod: false }),
    ev("page_view", s4, "v3", { path: "/" }, { ts: Date.parse("2026-10-12T15:00:00Z"), day: "2026-10-12" }),
  ];
  const s = summarize(events, { until: Date.parse("2026-10-09T19:30:00Z") });
  assert.deepEqual(s.excluded, { dogfood: 2, nonProdHost: 1, outsideWindow: 1 });
  const w = s.window;
  assert.deepEqual(w.viewsPerRoute, { "/apps": 2, "/daily-digest/a": 2, "/": 1, "/daily-digest/b": 1 });
  assert.equal(w.appsSessions, 2);
  assert.equal(w.toolOpenSessions, 1);
  assert.equal(w.appsToToolConversion, 0.5);
  assert.equal(w.toolOpenRate, 1, "2 tool_open / 2 /apps page_view");
  assert.deepEqual(w.toolOpenBySlug, { "engrave-merge": 1, "stripe-cleaver": 1 });
  assert.equal(w.digestReaders, 2, "v1 and v2");
  assert.equal(w.articleSessions, 2);
  assert.equal(w.secondArticleSessions, 1);
  assert.equal(w.secondArticleRate, 0.5);
  assert.deepEqual(Object.keys(s.weeks), ["2026-09-28"]);
  assert.equal(weekOf("2026-10-04"), "2026-09-28", "Sunday belongs to the week starting Monday");
  assert.equal(weekOf("2026-10-05"), "2026-10-05");
  assert.equal(summarize([]).window.secondArticleRate, null);
});

test("baseline reader: only SCAN MATCH site:ev:* and LRANGE site:ev:<day>; never em:* or the whole store", async () => {
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_u, init) => {
    const cmd = JSON.parse(init.body);
    sent.push(cmd);
    const result = cmd[0] === "SCAN" ? ["0", ["site:ev:2026-10-02"]] : ['{"event":"apps_view","sid":"s","vid":"v","dogfood":false,"prod":true,"ts":1,"day":"2026-10-02","props":{}}', "bad json"];
    return new Response(JSON.stringify({ result }), { status: 200 });
  };
  try {
    const evs = await readStore({ KV_REST_API_URL: "https://kv.invalid", KV_REST_API_READ_ONLY_TOKEN: "t" });
    assert.equal(evs.length, 1);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(sent, [["SCAN", "0", "MATCH", "site:ev:*", "COUNT", "1000"], ["LRANGE", "site:ev:2026-10-02", "0", "-1"]]);
  await assert.rejects(readStore({}), /No event store configured/);
});

test("/apps (v2 §5): 10 app rows in /apps order (Env Diff retired); row body → story, soft Open → tool; tracking attrs = shown position", async () => {
  const { getApps, toolsOrder, toolArt } = await import("../lib/apps.ts");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const order = toolsOrder(getApps());
  assert.deepEqual(order.map((a) => a.name), [
    "Stripe→Books Cleaver", "License Risk Gate", "Agent Bundle Tag", "Agent Eval Go/No-Go", "Deploy Decision Card", "Engrave Merge",
    "Enterprise Scorecard", "Hobby Deploy Burn Digest", "LLM Feature-Cost Tag", "What-Changed Card",
  ]);
  assert.equal(order.find((a) => a.id === "stripe-cleaver").blurb, "Turn a Stripe payout file into a QuickBooks or Xero import.", "locked Cleaver line");
  for (const a of order) assert.ok(toolArt(a.id).icon, `${a.id} has an icon`);
  const html = renderToStaticMarkup(createElement(ToolsList, { apps: order }));
  const rows = html.split('<li class="fx-arow"').slice(1);
  assert.equal(rows.length, 10, "10 rows");
  order.forEach((a, i) => {
    const r = rows[i];
    assert.ok(r.startsWith(` data-slug="${a.id}" data-pos="${i + 1}"`), `row ${i + 1} is ${a.id}`);
    const t = toolArt(a.id);
    assert.ok(r.includes(`<img class="fx-icon" src="${t.icon}" alt="${t.iconAlt.replace(/'/g, "&#x27;")}"`), `${a.id} icon + FINAL alt`);
    const open = [...r.matchAll(/<a class="fx-open" href="([^"]+)" data-tool-slug="([^"]+)" data-tool-pos="(\d+)" data-tool-src="apps" aria-label="Open ([^"]+)">Open<\/a>/g)];
    assert.equal(open.length, 1, `${a.id}: one soft Open`);
    assert.deepEqual([open[0][1], open[0][2], +open[0][3]], [a.url, a.id, i + 1], `${a.id}: Open → tool, tracked at its position`);
    if (a.id === "deploy-decision-card") {
      assert.ok(r.includes(`<a class="fx-stretch" href="${a.url}" data-tool-slug="${a.id}" data-tool-pos="${i + 1}" data-tool-src="apps">`), "Deploy Decision: row body → the tool (no story), source apps");
    } else {
      assert.ok(r.includes(`<a class="fx-stretch" href="/apps/${a.id}">`), `${a.id}: row body → /apps/${a.id} (no tool_open on a story tap)`);
    }
    assert.ok(SLUG_RE_OK(a.id), `${a.id} passes the tool_open slug check`);
  });
  assert.equal((html.match(/>Open<\/a>/g) || []).length, 10, "every row has a visible Open");
  assert.ok(!html.includes("fx-primary"), "no black pill on /apps (soft Opens only)");
  assert.ok(!/>(Get|Buy|Install)</.test(html), "Open, never Get");
});
const SLUG_RE_OK = (s) => validateSiteEvent({ v: 1, event: "tool_open", sid: SID, vid: VID, dogfood: false, props: { slug: s, position: 1 } }).ok;

/* ---------- Art (SPEC v2 sticker batch v3.1): final alt text, copied verbatim from ART-ALT-DRAFT.md ---------- */
/** "Digest: FINAL alt text" (Product Copy, Oct 2 11:15 PM ET), all 24 lines. */
const DIGEST_FINAL_ALT = new Map([
  ["break-loops-when-progress-stalls", "A looped toy train track with a switch lever that sends the train off onto a straight exit."],
  ["dont-follow-orders-in-tool-text", "A fishing hook on a line from a yellow float, caught on a paper slip."],
  ["the-ai-safety-paradox", "A red firework rocket with a fire extinguisher strapped to its side."],
  ["ask-before-doing-what-wasnt-asked", "A brass desk bell on a small steel block."],
  ["test-search-before-saying-none", "A flashlight shining a yellow beam into an open cardboard box."],
  ["make-routers-pick-from-a-fixed-list", "A mail sorter with a grid of pigeonholes and one pink envelope sliding into a slot."],
  ["keep-hard-rules-sticky", "A yellow sticky note pinned flat with a pushpin."],
  ["refuse-answers-sources-do-not-support", "A stool with a red seat and one leg snapped off, tipping over."],
  ["do-not-swap-tools-on-a-hunch", "A gold coin flipping in the air above a closed toolbox."],
  ["check-each-tool-step-before-next", "A level with a green bubble, resting on a single step."],
  ["prove-it-before-irreversible-actions", "A wax seal stamp pressing into red wax on an envelope."],
  ["tell-failed-tools-what-to-try-next", "A folded paper map with a red dotted route across it."],
  ["dont-blind-retry-sends-or-charges", "A paper airplane held by its tail in a pink clothespin."],
  ["laya-ai-deep-dive", "An old brass and steel diving helmet with an air hose trailing behind it."],
  ["system-one-and-jev-deep-dive", "An open pocket compass with a green face and a chain."],
  ["paperclip-deep-dive", "A giant paperclip holding a small stack of cards, the top one yellow."],
  ["block-done-if-code-changed-after-tests", "A test tube of green liquid in a clamp stand, with a drop falling in."],
  ["trim-long-logs-from-both-ends", "The two end pieces of a log, with the middle sawn out."],
  ["refuse-answers-that-dont-match-tool-results", "Two jigsaw pieces, one white and one yellow, that don't fit together."],
  ["bind-every-claim-to-a-real-citation", "An open book with a red binder clip holding a note to its page."],
  ["compare-models-only-under-a-locked-setup", "Two identical stopwatches side by side on a steel tray, their hands at the same spot."],
  ["reuse-the-same-key-when-a-tool-retries", "A brass key on a ring, with a white outline of the same key behind it."],
  ["require-held-out-lift-before-shipping-harness-edits", "A striped hot-air balloon tugging upward, tied down to a sandbag."],
  ["load-only-the-tools-this-turn-needs", "A tool belt with empty pockets and a single wrench."],
]);
/** "Tools: FINAL alt text" (Brand Creator, Oct 2 10:47 PM ET): [slug, hero alt (null = icon only), icon alt]. */
const TOOL_FINAL_ALT = [
  ["stripe-cleaver", "A big cleaver slices a paper receipt into torn strips, with the fee strip in yellow.", "A cartoon cleaver with a steel blade and a black handle."],
  ["license-gate", "A padlock with a brass shackle clamped shut on a rolled paper scroll.", "A padlock with a brass shackle."],
  ["agent-bundle-tag", "A pink luggage tag tied with string to a wrapped paper parcel.", "A pink luggage tag."],
  ["agent-eval-go-no-go", "A black and white checkered flag waving on a pole.", "A checkered flag."],
  ["deploy-decision-card", null, "A balance scale with two brass pans."],
  ["engrave-merge", "A laser engraver on a rail burning a line onto a paper tag.", "A laser engraver burning a line onto a tag."],
  ["enterprise-scorecard", "A round pressure gauge with green, yellow and red bands and one needle.", "A pressure gauge."],
  ["hobby-deploy-burn-digest", "A lit match, half burnt down, with a yellow flame.", "A lit match."],
  ["llm-feature-cost-tag", "A pink price tag hanging from a steel cog.", "A steel cog with a pink price tag."],
  ["what-changed-card", "A rubber stamp lifting off a paper sheet, leaving a round mark.", "A rubber stamp."],
];
/** Clay files replaced by the sticker batch (alignata-art/clay-replacement-list.md): none may come back. */
const CLAY_FILES = [
  ...[...DIGEST_FINAL_ALT.keys()].filter((s) => s !== "the-ai-safety-paradox").flatMap((s) => [`public/art/digest/${s}.webp`, `public/art/digest/${s}-card.webp`]),
  ...["fallback-tile", "license-gate", "stripe-cleaver", "the-ai-safety-paradox"].flatMap((b) => [`public/art/${b}-640.webp`, `public/art/${b}-1280.webp`]),
];
/** Width × height of a WebP file (VP8, VP8L or VP8X), read from its header. */
async function webpSize(path) {
  const { readFileSync } = await import("node:fs");
  const b = readFileSync(path);
  assert.equal(b.toString("ascii", 0, 4), "RIFF", `${path} is RIFF`);
  assert.equal(b.toString("ascii", 8, 12), "WEBP", `${path} is WebP`);
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  throw new Error(`${path}: unknown WebP chunk ${kind}`);
}

test("Daily Digest: tags, real read time, sticker hero art + FINAL alt, verbatim pull quotes, Next article chain", async () => {
  const { existsSync } = await import("node:fs");
  const { posts, getPostsNewestFirst } = await import("../content/posts.ts");
  const meta = await import("../lib/daily-digest/meta.ts");
  const { toPlainText } = await import("../lib/daily-digest/blocks.ts");
  assert.equal(posts.length, 24);
  assert.equal(new Set(posts.map((p) => p.slug)).size, posts.length, "unique slugs");
  const byTag = (t) => posts.filter((p) => meta.postTag(p) === t).map((p) => p.slug).sort();
  assert.deepEqual(byTag("Essay"), ["the-ai-safety-paradox"]);
  assert.deepEqual(byTag("Deep dive"), ["laya-ai-deep-dive", "paperclip-deep-dive", "system-one-and-jev-deep-dive"]);
  assert.equal(byTag("Technique").length, posts.length - 4);
  for (const p of posts) {
    const w = meta.wordCount(p);
    assert.ok(w > 0, p.slug);
    assert.equal(meta.readMinutes(p), Math.max(1, Math.round(w / 230)), p.slug);
    assert.match(meta.postMeta(p), /^(Technique|Deep dive|Essay) · [A-Z][a-z]{2} \d{1,2} · \d+ min read$/);
    assert.ok(p.hero, `${p.slug}: has its own art (no fallback)`);
    const hero = meta.postHero(p);
    assert.equal(hero.src, `/art/digest/${p.slug}-sticker.webp`, `${p.slug}: sticker art`);
    assert.ok(existsSync(`public${hero.src}`), `${p.slug}: ${hero.src} exists`);
    assert.deepEqual(await webpSize(`public${hero.src}`), [1920, 1080], `${p.slug}: one 16:9 file`);
    assert.equal(hero.alt, DIGEST_FINAL_ALT.get(p.slug), `${p.slug}: FINAL alt, verbatim`);
    assert.match(hero.pad, /^#[0-9A-F]{6}$/, `${p.slug}: pad colour`);
    assert.deepEqual(meta.cardImage(p), meta.heroImage(p), `${p.slug}: card and hero use the same file, size and alt`);
    assert.deepEqual([meta.heroImage(p).width, meta.heroImage(p).height], [1920, 1080]);
    assert.match(hero.alt, /^[A-Z].{10,200}\.$/, `${p.slug}: alt is one plain sentence`);
    if (p.pullQuote) {
      const paras = meta.bodyBlocks(p).filter((b) => b.kind === "paragraph").map((b) => toPlainText(b.text));
      assert.ok(paras.some((t) => t.includes(p.pullQuote.text)), `${p.slug}: pull quote is verbatim from the body`);
      if (p.pullQuote.cite) assert.ok(paras.includes(p.pullQuote.cite), `${p.slug}: cite is the article's own byline`);
    }
  }
  assert.equal(meta.postHero(posts.find((p) => p.slug === "the-ai-safety-paradox")).src, "/art/digest/the-ai-safety-paradox-sticker.webp", "the essay gets its new sticker");
  assert.deepEqual(posts.map((p) => p.slug).sort(), [...DIGEST_FINAL_ALT.keys()].sort(), "a FINAL alt line for every article, and no extra");
  assert.equal(meta.shortDate("2026-10-02"), "Oct 2");
  assert.equal(meta.shortDate("2026-09-16"), "Sep 16");
  // Next article: the next older one, oldest wraps to newest; following it visits every article once.
  const list = getPostsNewestFirst();
  list.forEach((p, i) => assert.equal(meta.nextPost(p.slug).slug, list[(i + 1) % list.length].slug));
  const seen = new Set();
  for (let s = list[0].slug; !seen.has(s); s = meta.nextPost(s).slug) seen.add(s);
  assert.equal(seen.size, list.length);
});

test("Daily Digest pages render: story cards (eyebrow = tag, title is the link, no Open), sticker art + FINAL alt, article story, 01. list", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { getPostsNewestFirst, getPost } = await import("../content/posts.ts");
  const meta = await import("../lib/daily-digest/meta.ts");
  const { ArticleStoryCard } = await import("../components/appstore/StoryCard.tsx");
  const { ArticleBody } = await import("../components/daily-digest/ArticleBody.tsx");
  const { default: Index } = await import("../app/daily-digest/page.tsx");
  const list = getPostsNewestFirst();
  const cards = renderToStaticMarkup(createElement(Index));
  assert.equal((cards.match(/data-post-card=/g) || []).length, 24);
  assert.equal((cards.match(/fx-scard fx-lead/g) || []).length, 5, "a lead row every 5 cards (§3 desktop layout repeated)");
  assert.ok(!/>Open</.test(cards), "no Open pill on the digest");
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  for (const p of list) {
    assert.ok(cards.includes(`<a class="fx-stretch" href="/daily-digest/${p.slug}">`), `${p.slug}: title is the link`);
    assert.ok(cards.includes(`<img src="/art/digest/${p.slug}-sticker.webp" alt="${esc(p.hero.alt)}" width="1920" height="1080"`), `${p.slug}: sticker + FINAL alt on the card`);
    assert.ok(cards.includes(`style="--art-pad:${p.hero.pad}"`), `${p.slug}: pad colour`);
    assert.ok(cards.includes(`<p class="fx-eyebrow">${meta.postTag(p)}</p>`), `${p.slug}: eyebrow = tag`);
  }
  const one = renderToStaticMarkup(createElement(ArticleStoryCard, { post: list[0], eyebrow: "Daily Digest · Technique", homeTarget: true }));
  assert.ok(one.includes('<p class="fx-eyebrow">Daily Digest · Technique</p>'));
  assert.ok(one.includes(`data-home-target="article:${list[0].slug}"`));
  // article story page: hero first (same file as the card), eyebrow, H1, card dek, meta line, body, Next article
  const { default: Article } = await import("../app/daily-digest/[slug]/page.tsx");
  const tech = getPost("break-loops-when-progress-stalls");
  const page = renderToStaticMarkup(await Article({ params: Promise.resolve({ slug: tech.slug }) }));
  const order = ["fx-story-hero", `src="/art/digest/${tech.slug}-sticker.webp"`, '<p class="fx-eyebrow">Daily Digest</p>', `<h1 class="fx-story-title">${tech.title}</h1>`,
    `<p class="fx-story-dek">${meta.postCardDek(tech)}</p>`, `Technique · <time dateTime="2026-10-02">Oct 2</time> · ${meta.readMinutes(tech)} min read`, "<h2>The problem</h2>", "<h2>Next article</h2>", ">All articles</a>"];
  let at = -1;
  for (const frag of order) { const i = page.indexOf(frag); assert.ok(i > at, `article order: ${frag}`); at = i; }
  assert.ok(page.includes(`alt="${esc(tech.hero.alt)}"`), "hero alt = FINAL");
  assert.ok(!page.includes("fx-primary") && !/>Open</.test(page), "no Open on an article");
  const body = renderToStaticMarkup(createElement(ArticleBody, { paragraphs: tech.paragraphs }));
  assert.match(body, /<h2>Try it<\/h2><ol start="1" style="counter-reset:fx-ol 0"><li>After each tool step/);
  const essay = getPost("the-ai-safety-paradox");
  const eb = renderToStaticMarkup(createElement(ArticleBody, { paragraphs: essay.paragraphs, pullQuote: essay.pullQuote }));
  assert.equal((eb.match(/data-pullquote/g) || []).length, 1);
  assert.match(eb, /design the locks\. And not just design them[^<]*<\/p><figure class="fx-pullquote" data-pullquote="true" aria-hidden="true">/);
  assert.match(eb, /<p class="fx-byline">— Osbel Morell<\/p><\/div>$/);
});

test("homepage (v2 §2): feed order, one black pill, Open → tool with home_click + tool_open attrs, story link, no Deploy Decision", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: Home } = await import("../app/page.tsx");
  const html = renderToStaticMarkup(createElement(Home));
  const feed = [...html.matchAll(/<article class="fx-scard[^"]*" data-kind="(tool|article)" data-(?:slug|post-card)="([^"]+)"/g)].map((m) => `${m[1]}:${m[2]}`);
  assert.deepEqual(feed, ["tool:stripe-cleaver", "article:break-loops-when-progress-stalls", "tool:license-gate", "article:dont-follow-orders-in-tool-text", "article:the-ai-safety-paradox"]);
  assert.ok(html.includes('class="fx-scard fx-lead" data-kind="tool" data-slug="stripe-cleaver"'), "Cleaver is the lead card");
  for (const [slug, pos] of [["stripe-cleaver", 1], ["license-gate", 2]]) {
    assert.ok(html.includes(`<a class="fx-stretch" href="/apps/${slug}">`), `${slug}: card title → story`);
    assert.match(html, new RegExp(`<a class="fx-open" href="/${slug}" data-tool-slug="${slug}" data-tool-pos="${pos}" data-tool-src="feed" data-home-target="tool:${slug}" aria-label="Open [^"]+">Open</a>`), `${slug}: soft Open → tool, source feed`);
  }
  for (const t of ["tools-pill", "digest-pill", "all-tools", "all-articles", "article:break-loops-when-progress-stalls", "article:dont-follow-orders-in-tool-text", "article:the-ai-safety-paradox"]) {
    assert.ok(html.includes(`data-home-target="${t}"`), `home_click target ${t}`);
    assert.ok(validateSiteEvent(env("home_click", { target: t })).ok, `${t} validates`);
  }
  assert.ok(html.includes('<p class="fx-eyebrow">Daily Digest · Technique</p>') && html.includes('<p class="fx-eyebrow">Daily Digest · Essay</p>'));
  assert.equal((html.match(/class="fx-pill"/g) || []).length, 1, "one black pill (Tools)");
  assert.ok(!html.includes("fx-primary"), "feed Opens are soft");
  assert.ok(!html.includes("deploy-decision"), "Deploy Decision never in the feed");
  assert.ok(!/<h2[^>]*>(Tools|Daily Digest)<\/h2>/.test(html), "no section headings in the feed");
});

test("tool story (v2 §4): 9 static stories (no Deploy Decision), hero + H1 + black Open row, About body, end row, sticky bar", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { getApps, toolsOrder, toolArt, TOOL_STORY } = await import("../lib/apps.ts");
  const mod = await import("../app/apps/[slug]/page.tsx");
  const slugs = mod.generateStaticParams().map((p) => p.slug);
  assert.equal(slugs.length, 9);
  assert.ok(!slugs.includes("deploy-decision-card"));
  assert.equal(mod.dynamicParams, false);
  const order = toolsOrder(getApps());
  for (const slug of slugs) {
    const pos = order.findIndex((a) => a.id === slug) + 1;
    const app = order[pos - 1];
    const html = renderToStaticMarkup(await mod.default({ params: Promise.resolve({ slug }) }));
    const t = toolArt(slug);
    assert.ok(html.indexOf(`src="${t.art}"`) < html.indexOf('<h1 class="fx-story-title">'), `${slug}: hero above the H1`);
    assert.ok(html.includes(`<h1 class="fx-story-title">${TOOL_STORY[slug].title.replace(/'/g, "&#x27;")}</h1>`), `${slug}: H1 = card title`);
    const opens = [...html.matchAll(/<a class="fx-open fx-primary" href="([^"]+)" data-tool-slug="([^"]+)" data-tool-pos="(\d+)"/g)];
    assert.equal(opens.length, 3, `${slug}: black Open in the first row, the end row and the sticky bar`);
    for (const o of opens) assert.deepEqual([o[1], o[2], +o[3]], [app.url, slug, pos], `${slug}: Open → tool at its /apps position`);
    assert.ok(html.includes('data-row="first"') && html.includes('data-row="end"'));
    assert.ok(html.includes('data-sticky-open=""') && html.includes('aria-hidden="true"'), `${slug}: sticky bar starts hidden`);
    assert.ok(html.includes(">All tools</a>"), `${slug}: ends with All tools`);
    assert.ok(html.includes("<h2>What</h2>") && html.includes("<h2>Why</h2>") && html.includes("<h2>How</h2>"), `${slug}: About body`);
    assert.ok(!/aria-label="Close|>×</.test(html), "no close (X)");
  }
  const cl = renderToStaticMarkup(await mod.default({ params: Promise.resolve({ slug: "stripe-cleaver" }) }));
  assert.ok(cl.includes("<li>Tap &quot;Run the cleaver&quot;.</li>") && cl.includes("One drop, one download."), "Cleaver About fixes on the story");
  const md = await mod.generateMetadata({ params: Promise.resolve({ slug: "license-gate" }) });
  assert.equal(md.alternates.canonical, "/apps/license-gate");
  assert.equal(md.title, "Catch license problems before release");
});

test("home_click: only allow-listed targets validate; extra or missing props are rejected", () => {
  for (const t of ["Tools-pill", "tools", "tool:", "tool:Engrave", "article:a b", "nav:", "https://evil.com", "tool:x?y=1", "nav:" + "a".repeat(41), "x".repeat(300)]) {
    const v = validateSiteEvent(env("home_click", { target: t }));
    assert.equal(v.ok, false, t);
    assert.equal(v.reason, "bad_target", t);
  }
  assert.equal(validateSiteEvent(env("home_click", { target: 7 })).reason, "bad_target");
  assert.equal(validateSiteEvent(env("home_click", {})).reason, "missing_prop:target");
  assert.equal(validateSiteEvent(env("home_click", { target: "tools-pill", slug: "x" })).reason, "unknown_prop:slug");
  assert.equal(validateSiteEvent(env("tool_open", { slug: "x", position: 1, target: "tools-pill" })).reason, "unknown_prop:target");
});

test("home_click target: explicit data-home-target wins; otherwise derived from the same-site path", () => {
  assert.equal(homeClickTarget("tools-pill", "/apps"), "tools-pill");
  assert.equal(homeClickTarget("digest-pill", "/daily-digest"), "digest-pill");
  assert.equal(homeClickTarget("all-tools", "/apps"), "all-tools");
  assert.equal(homeClickTarget("nav:wordmark", "/"), "nav:wordmark");
  assert.equal(homeClickTarget("bogus target", "/apps"), null, "an invalid explicit target is never sent");
  assert.equal(homeClickTarget(null, "/apps"), "nav:apps");
  assert.equal(homeClickTarget(null, "/daily-digest/"), "nav:daily-digest");
  assert.equal(homeClickTarget(null, "/"), "nav:home");
  assert.equal(homeClickTarget(null, "/daily-digest/break-loops-when-progress-stalls"), "article:break-loops-when-progress-stalls");
  assert.equal(homeClickTarget(null, "/engrave-merge"), "tool:engrave-merge");
  assert.equal(homeClickTarget(null, null), null, "external link");
  assert.equal(homeClickTarget(null, "/a/b/c"), null);
  assert.equal(homeClickTarget(null, "/Weird_Path"), null);
});

test("baseline summary: home_click per target, sessions, visitors and / tap rate; dogfood and non-prod excluded", () => {
  const T = Date.parse("2026-10-02T21:00:00Z");
  const ev = (event, sid, vid, props = {}, extra = {}) => ({ v: 1, event, sid, vid, dogfood: false, props, ts: T, day: "2026-10-02", host: "alignata.com", prod: true, ...extra });
  const s = summarize([
    ev("page_view", "h1", "v1", { path: "/" }), ev("home_click", "h1", "v1", { target: "tools-pill" }), ev("home_click", "h1", "v1", { target: "nav:daily-digest" }),
    ev("page_view", "h2", "v1", { path: "/" }), ev("home_click", "h2", "v1", { target: "tools-pill" }),
    ev("page_view", "h3", "v2", { path: "/" }),
    ev("page_view", "h4", "v3", { path: "/" }),
    ev("home_click", "d", "vd", { target: "tools-pill" }, { dogfood: true }),
    ev("home_click", "p", "vp", { target: "digest-pill" }, { host: "alignata-git-main.vercel.app", prod: false }),
  ]).window;
  assert.equal(s.homeClicks, 3);
  assert.equal(s.homeClickSessions, 2);
  assert.equal(s.homeClickVisitors, 1);
  assert.equal(s.homeSessions, 4);
  assert.equal(s.homeSessionsWithClick, 2);
  assert.equal(s.homeClickRate, 0.5);
  assert.deepEqual(s.homeClickByTarget, { "tools-pill": 2, "nav:daily-digest": 1 });
  assert.equal(summarize([]).window.homeClickRate, null);
});

test("art: tool stickers + icons with FINAL alt, every file a real WebP of the right shape, and no clay left", async () => {
  const { existsSync, readdirSync } = await import("node:fs");
  const { getApps, toolArt } = await import("../lib/apps.ts");
  const apps = getApps();
  assert.deepEqual(apps.map((a) => a.id).sort(), TOOL_FINAL_ALT.map(([s]) => s).sort(), "a FINAL alt row for every listed tool");
  for (const [slug, heroAlt, iconAlt] of TOOL_FINAL_ALT) {
    const t = toolArt(slug);
    assert.equal(t.icon, `/art/${slug}-sticker-icon.webp`, `${slug} icon path`);
    assert.ok(existsSync(`public${t.icon}`), `${slug} icon exists`);
    const [iw, ih] = await webpSize(`public${t.icon}`);
    assert.ok(iw === ih && iw >= 168, `${slug} icon is square and at least 3x of 56px (${iw}x${ih})`);
    assert.equal(t.iconAlt, iconAlt, `${slug} icon alt, verbatim`);
    assert.match(t.pad, /^#[0-9A-F]{6}$/);
    if (heroAlt === null) {
      assert.equal(t.art, null, `${slug} is icon-only (no story page)`);
      continue;
    }
    assert.equal(t.art, `/art/${slug}-sticker.webp`, `${slug} hero path`);
    assert.ok(existsSync(`public${t.art}`), `${slug} hero exists`);
    assert.deepEqual(await webpSize(`public${t.art}`), [1920, 1080], `${slug}: one 16:9 file`);
    assert.equal(t.alt, heroAlt, `${slug} hero alt, verbatim`);
  }
  const files = readdirSync("public/art", { recursive: true }).map(String).filter((f) => /\.[a-z]+$/.test(f));
  for (const f of files) assert.match(f, /^(digest\/)?[a-z0-9-]+-sticker(-icon)?\.webp$/, `public/art/${f} is sticker art (no clay, no fallback tile)`);
  assert.equal(files.length, 24 + 9 + 10 + 1, "24 Digest heroes + 9 tool heroes + 10 icons + the About hero");
  assert.ok(files.includes("about-sticker.webp"), "About hero (company pages, Oct 3)");
  assert.deepEqual(await webpSize("public/art/about-sticker.webp"), [1920, 1080], "About hero: one 16:9 file");
  for (const f of CLAY_FILES) assert.ok(!existsSync(f), `${f} is gone`);
  assert.equal(CLAY_FILES.length, 54);
});

test("copy (COPY.md, LOCKED): About fixes, tool story titles/deks, v2 dek trims; Deploy Decision has no story", async () => {
  const { readFileSync } = await import("node:fs");
  const { getApps, toolsOrder, TOOL_STORY, storyHref, toolAbout } = await import("../lib/apps.ts");
  const { TOOL_ABOUT } = await import("../lib/tool-about.ts");
  const { posts } = await import("../content/posts.ts");
  const meta = await import("../lib/daily-digest/meta.ts");
  assert.equal(TOOL_ABOUT["stripe-cleaver"].how[1], 'Tap "Run the cleaver".');
  assert.match(TOOL_ABOUT["stripe-cleaver"].why, /^One drop, one download\. /);
  assert.equal(TOOL_ABOUT["license-gate"].how[1], 'Tap "Run the check".');
  const lg = getApps().find((a) => a.id === "license-gate");
  assert.equal(lg.how[1], 'Tap "Run the check".', "public/apps.json matches");
  for (const f of ["public/apps.json", "lib/tool-about.ts"]) assert.ok(!readFileSync(f, "utf8").includes("(one black pill)"), `${f}: no "(one black pill)"`);
  for (const t of ["stripe-cleaver", "license-gate"]) assert.ok(!readFileSync(`components/${t}/AboutPanel.tsx`, "utf8").includes("one black pill"));
  assert.deepEqual(TOOL_STORY["stripe-cleaver"], { title: "Get Stripe payouts into your books", dek: "Fees get their own rows, and the file never leaves your browser." });
  assert.deepEqual(TOOL_STORY["license-gate"], { title: "Catch license problems before release", dek: "Copyleft hits show up now, not when a release is on the clock." });
  const order = toolsOrder(getApps());
  for (const a of order) {
    if (a.id === "deploy-decision-card") {
      assert.equal(TOOL_STORY[a.id], undefined, "Deploy Decision: plain /apps row, no story");
      assert.equal(storyHref(a.id), null);
      continue;
    }
    const st = TOOL_STORY[a.id];
    assert.ok(st, `${a.id} has a story title + dek`);
    assert.ok(st.title.length <= 40, `${a.id} title ≤ 40`);
    assert.ok(st.dek.length <= 70 && /^[A-Z][^.]*\.$/.test(st.dek), `${a.id} dek ≤ 70, one sentence`);
    assert.equal(storyHref(a.id), `/apps/${a.id}`);
    const ab = toolAbout(a);
    assert.ok(ab && ab.pitch && ab.what && ab.why && ab.how.length, `${a.id}: story body = existing About text`);
  }
  for (const p of posts) assert.ok(meta.postCardDek(p).length <= 70, `${p.slug}: card dek ≤ 70 (${meta.postCardDek(p).length})`);
  const trims = {
    "break-loops-when-progress-stalls": "Check progress every few steps and change course when an agent stalls.",
    "keep-hard-rules-sticky": "Repeat the must-follow rules every turn so long chats keep them.",
    "system-one-and-jev-deep-dive": "How TypeSafe's decision model works and when it beats a chat model.",
    "paperclip-deep-dive": "A tool for running AI agent teams: setup, risks, and how it compares.",
    "reuse-the-same-key-when-a-tool-retries": "Reuse one request ID on retries so payments and deploys run once.",
  };
  for (const [slug, dek] of Object.entries(trims)) assert.equal(meta.postCardDek(posts.find((p) => p.slug === slug)), dek, `${slug}: COPY.md v2 trim`);
});

test("motion (SPEC v2 §7): one switch, morph names on both sides, reduced motion, taps never wait", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const read = (f) => readFileSync(f, "utf8");
  const flag = read("lib/motion.ts");
  assert.match(flag, /export const MOTION_ON: boolean = process\.env\.NEXT_PUBLIC_MOTION !== "off";/, "one flag, default on, NEXT_PUBLIC_MOTION=off turns it off");
  const motion = read("components/appstore/Motion.tsx");
  assert.match(motion, /MOTION_ON && !!VT/, "no <ViewTransition> rendered when the switch is off");
  assert.match(motion, /share="morph" default="none"/, "morph pairs only; nothing else animates");
  assert.ok(!/"use client"/.test(motion), "Motion wrappers are server components (no added client JS)");
  assert.match(read("app/layout.tsx"), /data-motion=\{MOTION_ON \? "on" : "off"\}/, "<html data-motion> follows the switch");
  assert.match(read("app/layout.tsx"), /import "\.\/motion\.css";/);
  const css = read("app/motion.css");
  const sels = css.split("\n").map((l) => l.match(/^\s*([^@/*\s}][^{}]*)\{/)?.[1]).filter(Boolean);
  assert.ok(sels.length > 10, "motion.css rules parsed");
  for (const sel of sels) {
    if (/view-transition|^\s*(from|to)\b/.test(sel)) continue;
    assert.match(sel, /html\[data-motion="on"\]/, `motion.css: "${sel.trim()}" is behind the switch`);
  }
  assert.match(css, /html\[data-motion="on"\] \.fx-header \{ view-transition-name: site-header; \}/, "header stays still");
  assert.match(css, /::view-transition-group\(\.morph\) \{ animation-duration: 350ms;/, "morph 350ms (≤ 400ms)");
  assert.match(css, /::view-transition \{ pointer-events: none; \}/, "a transition never swallows a tap");
  const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduce, /::view-transition-group\(\*\)[^{]*\{\s*animation-duration: 0s !important; animation-delay: 0s !important;/, "reduced motion: no movement");
  assert.match(read("app/fantasy.css"), /@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{ transition: none !important; animation: none !important;/, "reduced motion: no CSS transitions anywhere");
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) and \(pointer: coarse\) \{\n[^\n]*\n\s*html\[data-motion="on"\] \.fx-scard:active/, "press scale: touch only, never reduced");
  // Both sides of each pair carry the same name.
  assert.match(read("components/appstore/ArtFigure.tsx"), /<Morph name=\{`art-\$\{slug\}`\}>/, "card art + story hero: art-<slug>");
  const card = read("components/appstore/StoryCard.tsx");
  assert.match(card, /<Morph name=\{`title-\$\{app\.id\}`\}>/, "tool card title: title-<slug>");
  assert.match(card, /<Morph name=\{`title-\$\{post\.slug\}`\}>/, "article card title: title-<slug>");
  assert.match(read("app/apps/[slug]/page.tsx"), /<Morph name=\{`title-\$\{app\.id\}`\}>\s*<h1/, "tool story H1: title-<slug>");
  assert.match(read("app/daily-digest/[slug]/page.tsx"), /<Morph name=\{`title-\$\{post\.slug\}`\}>\s*<h1/, "article story H1: title-<slug>");
  for (const f of ["app/apps/[slug]/page.tsx", "app/daily-digest/[slug]/page.tsx"]) assert.match(read(f), /<PageFade story>/, `${f}: story body fades in`);
  for (const f of ["app/page.tsx", "app/daily-digest/page.tsx", "components/appstore/ToolsList.tsx"]) assert.match(read(f), /<PageFade>/, `${f}: 150ms crossfade`);
  // React only plays enter/exit for a <ViewTransition> that is not inside a freshly inserted DOM node: the fade must
  // be the outermost thing each page (and the Daily Digest layout) returns.
  for (const f of ["app/page.tsx", "components/appstore/ToolsList.tsx", "app/apps/[slug]/page.tsx", "app/daily-digest/layout.tsx"]) {
    assert.match(read(f), /return \(\n\s*<PageFade( story)?>\n/, `${f}: <PageFade> is outermost`);
  }
  // Rule 6: React holds a commit for an unloaded <img> inside a <ViewTransition> unless it has onLoad.
  assert.match(read("components/appstore/Img.tsx"), /onLoad=\{noop\}/);
  for (const f of ["components/appstore/ArtFigure.tsx", "components/appstore/AppRow.tsx", "components/appstore/ToolsList.tsx", "components/appstore/StickyOpen.tsx"]) {
    assert.ok(!/<img\b/.test(read(f)), `${f}: images go through <Img> (never hold navigation)`);
  }
  for (const d of ["app", "app/apps", "app/apps/[slug]", "app/daily-digest", "app/daily-digest/[slug]"]) {
    assert.ok(!existsSync(`${d}/loading.tsx`) && !existsSync(`${d}/loading.js`), `${d}: no loading fallback in front of the hero`);
  }
});

/* ---------- tool_open on tool stories + sitemap stories (CEO ruling, Oct 3 2026) ---------- */

/** Capture what sendSiteEvent would beacon (Node has no navigator); restores the global afterwards. */
async function captureBeacons(fn) {
  const sent = [];
  const had = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: { sendBeacon: (url, blob) => (sent.push({ url, blob }), true) }, configurable: true, writable: true });
  try {
    await fn();
  } finally {
    if (had) Object.defineProperty(globalThis, "navigator", had);
    else delete globalThis.navigator;
  }
  return Promise.all(sent.map(async (b) => ({ url: b.url, body: JSON.parse(await b.blob.text()) })));
}
/** The <a> tags of rendered HTML as attribute maps, with a getAttribute() like the DOM's. */
const anchors = (html) =>
  [...html.matchAll(/<a\b([^>]*)>/g)].map((m) => {
    const attrs = Object.fromEntries([...m[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    return { attrs, getAttribute: (n) => (n in attrs ? attrs[n] : null) };
  });

test("tool_open: story row Opens + sticky Open count (same event + payload); row-body taps don't; skips + dogfood as today", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { getApps, toolsOrder } = await import("../lib/apps.ts");
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const mod = await import("../app/apps/[slug]/page.tsx");
  const order = toolsOrder(getApps());
  const ids = { sid: SID, vid: VID, dogfood: false };

  assert.equal(toolOpenPage("/apps"), true);
  assert.equal(toolOpenPage("/apps/stripe-cleaver"), true);
  assert.equal(toolOpenPage("/"), true, "homepage feed Opens count too (CEO, Oct 3)");
  for (const p of ["/stripe-cleaver", "/daily-digest", "/daily-digest/a", "/apps/a/b", "/apps/", "/appsx"]) assert.equal(toolOpenPage(p), false, `${p}: no tool_open`);

  for (const { slug } of mod.generateStaticParams()) {
    const pos = order.findIndex((a) => a.id === slug) + 1;
    const html = renderToStaticMarkup(await mod.default({ params: Promise.resolve({ slug }) }));
    const sticky = html.slice(html.indexOf("data-sticky-open"));
    const tools = anchors(html).filter((a) => a.getAttribute("data-tool-slug"));
    assert.equal(tools.length, 3, `${slug}: first-row Open, end-row Open, sticky Open`);
    assert.equal(anchors(sticky).filter((a) => a.getAttribute("data-tool-slug")).length, 1, `${slug}: one of them is the sticky bar's`);
    for (const a of tools) assert.ok(a.attrs.class.split(" ").includes("fx-open") && a.attrs.href === order[pos - 1].url, `${slug}: only Open pills carry data-tool-slug; plain <a href> to the tool`);
    const sent = await captureBeacons(() => tools.forEach((a) => assert.equal(trackToolOpen(`/apps/${slug}`, a, ids, false), true)));
    assert.equal(sent.length, 3, `${slug}: each Open sends one tool_open`);
    const srcs = tools.map((a) => a.getAttribute("data-tool-src"));
    assert.deepEqual(srcs, ["story", "story", "sticky"], `${slug}: first row + end row = story, sticky bar = sticky`);
    for (const [i, { url, body }] of sent.entries()) {
      assert.equal(url, "/api/site/e");
      assert.deepEqual(body, { v: 1, event: "tool_open", sid: SID, vid: VID, dogfood: false, props: { slug, position: pos, source: srcs[i] } }, `${slug}: /apps position + source`);
      assert.ok(validateSiteEvent(body).ok, `${slug}: passes the existing validator`);
    }
    // Everything else on a story (header, All tools, Next…) has no data-tool-slug, so closest() finds nothing.
    for (const a of anchors(html).filter((a) => !a.getAttribute("data-tool-slug"))) assert.ok(!/fx-open/.test(a.attrs.class || ""), `${slug}: untracked link is not an Open`);
  }

  // /apps: unchanged. Open pills send exactly as before; a row-body tap opens the story with a plain link and sends nothing.
  const list = anchors(renderToStaticMarkup(createElement(ToolsList, { apps: order })));
  const bodies = list.filter((a) => a.attrs.class === "fx-stretch" && a.attrs.href.startsWith("/apps/"));
  assert.equal(bodies.length, 9, "9 row bodies open a story");
  for (const b of bodies) assert.equal(b.getAttribute("data-tool-slug"), null, `${b.attrs.href}: row body has no tracking attrs`);
  const none = await captureBeacons(() => {
    for (const b of bodies) assert.equal(trackToolOpen("/apps", b.getAttribute("data-tool-slug") ? b : null, ids, false), false);
  });
  assert.equal(none.length, 0, "row-body taps send no tool_open");
  const appsOpens = list.filter((a) => a.attrs.class === "fx-open");
  const appsSent = await captureBeacons(() => appsOpens.forEach((a) => trackToolOpen("/apps", a, ids, false)));
  assert.deepEqual(appsSent.map((x) => x.body.props), order.map((a, i) => ({ slug: a.id, position: i + 1, source: "apps" })), "/apps Opens: same payload + source apps");

  // Exclusions apply exactly as for /apps Opens: skipped devices send nothing; dogfood sends flagged, and the baseline drops it.
  const open = anchors(renderToStaticMarkup(await mod.default({ params: Promise.resolve({ slug: "stripe-cleaver" }) }))).find((a) => a.getAttribute("data-tool-slug"));
  for (const env of [{ webdriver: true, local: mem() }, { webdriver: false, local: mem({ em_iid: OWNER }) }]) {
    const skip = shouldSkip(env);
    assert.equal(skip, true);
    const s = await captureBeacons(() => {
      assert.equal(trackToolOpen("/apps/stripe-cleaver", open, ids, skip), false);
      assert.equal(trackToolOpen("/apps", open, ids, skip), false, "same rule as /apps");
    });
    assert.equal(s.length, 0, "skipped device (webdriver / EXCLUDED_IIDS): nothing sent");
  }
  assert.equal(trackToolOpen("/apps/stripe-cleaver", open, null, false), false, "no ids yet: nothing sent");
  const dog = { ...ids, dogfood: dogfoodSession("?dogfood=1", mem()) };
  const ds = await captureBeacons(() => trackToolOpen("/apps/stripe-cleaver", open, dog, false));
  assert.equal(ds.length, 1);
  assert.equal(ds[0].body.dogfood, true, "dogfood session: flagged like every other event");
  assert.equal(dogfoodHref(open.attrs.href, "https://alignata.com"), "/stripe-cleaver?dogfood=1", "the plain <a href> still gets ?dogfood=1");
  const T = Date.parse("2026-10-03T12:00:00Z");
  const sum = summarize([{ ...ds[0].body, ts: T, day: "2026-10-03", host: "alignata.com", prod: true }], { until: T + 1 });
  assert.equal(sum.excluded.dogfood, 1, "baseline drops the dogfood story Open");
  assert.equal(Object.keys(sum.window.toolOpenBySlug).length, 0);

  // Wiring: the tracker marks dogfood first, then calls trackToolOpen on the tapped a[data-tool-slug]; capture phase, never preventDefault.
  const { readFileSync } = await import("node:fs");
  const tracker = readFileSync("components/site/SiteTracker.tsx", "utf8");
  assert.match(tracker, /trackToolOpen\(location\.pathname, \(e\.target as Element \| null\)\?\.closest\?\.\("a\[data-tool-slug\]"\) \?\? null, ids\.current, skip\.current\);/);
  assert.ok(tracker.indexOf("markToolLink((e.target") < tracker.indexOf("trackToolOpen(location"), "?dogfood=1 is added before tracking");
  assert.ok(!/preventDefault\(|stopPropagation\(/.test(tracker.replace(/\/\/.*$/gm, "")), "tracking never blocks the tap");
  assert.match(tracker, /addEventListener\("click", onClick, true\)/);
});

test("sitemap: adds exactly the tool stories (no Deploy Decision story); everything else unchanged", async () => {
  const urls = (await import("../app/sitemap.ts")).default().map((e) => e.url);
  const { getApps } = await import("../lib/apps.ts");
  const { posts } = await import("../content/posts.ts");
  const mod = await import("../app/apps/[slug]/page.tsx");
  const S = "https://alignata.com";
  const storySlugs = mod.generateStaticParams().map((p) => p.slug);
  const stories = urls.filter((u) => u.startsWith(`${S}/apps/`));
  const guides = urls.filter((u) => u.startsWith(`${S}/guides/`));
  assert.deepEqual(guides, [`${S}/guides/lightburn-variable-text-etsy-csv`, `${S}/guides/etsy-download-orders-csv-personalization`].sort((a, b) => urls.indexOf(a) - urls.indexOf(b)), "published guides, at the end");
  assert.deepEqual(stories.sort(), storySlugs.map((s) => `${S}/apps/${s}`).sort(), "story URLs = the static story pages");
  assert.equal(stories.length, 9);
  assert.ok(!stories.includes(`${S}/apps/deploy-decision-card`), "Deploy Decision has no story");
  const company = [`${S}/about`, `${S}/privacy`];
  const before = [S, `${S}/apps`, ...getApps().map((a) => `${S}${a.url}`), `${S}/daily-digest`, ...posts.map((p) => `${S}/daily-digest/${p.slug}`)];
  assert.deepEqual(urls.filter((u) => !stories.includes(u) && !guides.includes(u) && !company.includes(u)), before, "the 37 existing URLs, same order");
  assert.deepEqual(urls.filter((u) => company.includes(u)), company, "company pages (About, Privacy) after the Digest, before the guides");
  assert.ok(!urls.includes(`${S}/terms`), "Terms is held: not in the sitemap");
  assert.equal(urls.length, 50);
  assert.equal(new Set(urls).size, urls.length);
  const robots = (await import("../app/robots.ts")).default();
  assert.deepEqual(robots, { rules: { userAgent: "*", allow: "/" }, sitemap: "https://alignata.com/sitemap.xml" }, "robots unchanged");
});

/* ---------- QA 48773f3 fixes: dogfood on card/row links; phone story fold ---------- */

test("dogfood: card + row links (a.fx-stretch) on / and /apps get ?dogfood=1 exactly like the Open pills", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { getApps, toolsOrder } = await import("../lib/apps.ts");
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const Home = (await import("../app/page.tsx")).default;
  assert.equal(DOGFOOD_LINKS, "a[data-tool-slug], a.fx-stretch");
  const matches = (a) => a.getAttribute("data-tool-slug") !== null || (a.attrs.class || "").split(" ").includes("fx-stretch");
  const O = "https://alignata.com";
  const pages = {
    "/": anchors(renderToStaticMarkup(await Home())),
    "/apps": anchors(renderToStaticMarkup(createElement(ToolsList, { apps: toolsOrder(getApps()) }))),
  };
  for (const [page, links] of Object.entries(pages)) {
    const cards = links.filter((a) => (a.attrs.class || "").split(" ").includes("fx-stretch"));
    assert.ok(cards.length >= (page === "/apps" ? 10 : 5), `${page}: card/row links found (${cards.length})`);
    for (const a of cards) {
      assert.ok(matches(a), `${page} ${a.attrs.href}: matched by DOGFOOD_LINKS`);
      assert.equal(dogfoodHref(a.attrs.href, O), `${a.attrs.href}?dogfood=1`, `${page} ${a.attrs.href}: gets ?dogfood=1`);
    }
    for (const a of links.filter((a) => a.getAttribute("data-tool-slug"))) assert.ok(matches(a), `${page}: Open pills still matched`);
    if (page === "/apps") {
      const stories = cards.filter((a) => a.attrs.href.startsWith("/apps/")).map((a) => a.attrs.href);
      assert.equal(stories.length, 9, "/apps: the 9 row bodies → stories, e.g. /apps/stripe-cleaver");
      assert.ok(stories.includes("/apps/stripe-cleaver"));
    }
  }
  // Rewriting a card href never adds tracking: tool_open still needs data-tool-slug.
  const story = pages["/apps"].find((a) => a.attrs.href === "/apps/stripe-cleaver");
  const sent = await captureBeacons(() => assert.equal(trackToolOpen("/apps", story.getAttribute("data-tool-slug") ? story : null, { sid: SID, vid: VID, dogfood: true }, false), false));
  assert.equal(sent.length, 0);
  // Same mechanism, both places: on arrival (querySelectorAll) and on tap (closest), before any tracking.
  const { readFileSync } = await import("node:fs");
  const tracker = readFileSync("components/site/SiteTracker.tsx", "utf8");
  assert.match(tracker, /if \(dogfood\) document\.querySelectorAll\(DOGFOOD_LINKS\)\.forEach\(markToolLink\);/);
  assert.match(tracker, /if \(dogfoodRef\.current\) markToolLink\(\(e\.target as Element \| null\)\?\.closest\?\.\(DOGFOOD_LINKS\) \?\? null\);/);
  assert.ok(!tracker.includes('"a[data-tool-slug]").forEach'), "no second, narrower selector left behind");
});

test("story fold (SPEC §4/§10): phone-only tighter spacing above the first app row; titles never clamped; desktop untouched", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync("app/appstore.css", "utf8");
  const phone = css.match(/@media \(max-width: 899\.98px\) \{\n  \.fx-story-head \{ padding-top: 16px; \}[\s\S]*?\n\}/);
  assert.ok(phone, "phone story block present");
  for (const r of [".fx-story-title { margin-top: 4px; line-height: 1.05; }", ".fx-story-dek { margin-top: 8px; }", ".fx-story-head > .fx-story-row { margin-top: 16px; }", ".fx-app-row.fx-story-row { padding: 12px 0; }"]) {
    assert.ok(phone[0].includes(r), `phone: ${r}`);
  }
  assert.ok(!/line-clamp|text-overflow|-webkit-box/.test(css.slice(css.indexOf(".fx-story-title"), css.indexOf(".fx-story-dek"))), "story title never clamped or truncated");
  // Desktop (>= 900px) rules unchanged.
  assert.ok(css.includes("@media (min-width: 900px) {\n  .fx-story-head { padding-top: 48px; }"));
  assert.ok(css.includes(".fx-story-title { margin-top: 16px; font-size: 40px; line-height: 1.05; }"));
  assert.ok(css.includes(".fx-story-dek { margin-top: 20px; font-size: 22px; }"));
  assert.ok(css.includes(".fx-app-row.fx-story-row { margin-top: 24px; padding: 16px 0;"), "base row spacing (desktop) unchanged");
  // The rendered measurement (WebKit, 390x844: all 10 first Opens end <= 650; 1280: Cleaver <= 790) is
  // /workspace/alignata-mockups/v2-story-fold-check.mjs against `next start`.
});

/* ---------- tool_open source tag + feed Opens + preview deploys don't store (CEO ruling, Oct 3 2026 6:33 AM ET) ---------- */

test("tool_open source: validator accepts feed|apps|story|sticky|guide, still accepts old clients without it, rejects anything else", () => {
  assert.deepEqual([...TOOL_OPEN_SOURCES], ["feed", "apps", "story", "sticky", "guide"], "guide added Oct 3; older values unchanged");
  assert.deepEqual(SITE_EVENT_OPTIONAL_PROPS, { tool_open: ["source"] });
  assert.deepEqual(SITE_EVENT_PROPS.tool_open, ["slug", "position"], "required props unchanged");
  for (const source of TOOL_OPEN_SOURCES) {
    const v = validateSiteEvent(env("tool_open", { slug: "stripe-cleaver", position: 1, source }));
    assert.ok(v.ok, source);
    assert.deepEqual(v.event.props, { slug: "stripe-cleaver", position: 1, source });
  }
  const old = validateSiteEvent(env("tool_open", { slug: "stripe-cleaver", position: 1 }));
  assert.ok(old.ok, "a client cached before the source tag still validates");
  assert.deepEqual(old.event.props, { slug: "stripe-cleaver", position: 1 }, "stored as sent: no guessed source");
  for (const bad of ["", "Feed", "home", "nav", 1, null, true, "feed ", "x".repeat(50)]) {
    const v = validateSiteEvent(env("tool_open", { slug: "stripe-cleaver", position: 1, source: bad }));
    assert.equal(v.ok, false, `source ${JSON.stringify(bad)} rejected`);
    assert.equal(v.reason, "bad_source");
  }
  for (const [ev, props] of [["page_view", { path: "/" }], ["home_click", { target: "tool:stripe-cleaver" }], ["apps_view", {}], ["article_view", { slug: "a", n: 1 }]]) {
    const v = validateSiteEvent(env(ev, { ...props, source: "feed" }));
    assert.equal(v.reason, "unknown_prop:source", `${ev}: source only on tool_open`);
  }
  assert.equal(validateSiteEvent(env("tool_open", { slug: "stripe-cleaver", source: "feed" })).reason, "missing_prop:position", "slug + position still required");
  assert.equal(toolOpenSource("/", null), "feed");
  assert.equal(toolOpenSource("/apps", null), "apps");
  assert.equal(toolOpenSource("/apps/license-gate", null), "story");
  assert.equal(toolOpenSource("/apps/license-gate", "sticky"), "sticky");
  assert.equal(toolOpenSource("/apps/license-gate", "bogus"), "story", "unknown attribute → derived from the page");
  assert.equal(toolOpenSource("/stripe-cleaver", null), null);
});

test("feed Open: sends home_click (unchanged) AND tool_open {source: feed}; card bodies send what they did; /apps row bodies untracked", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { getApps, toolsOrder } = await import("../lib/apps.ts");
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const Home = (await import("../app/page.tsx")).default;
  const order = toolsOrder(getApps());
  const ids = { sid: SID, vid: VID, dogfood: false };
  const links = anchors(renderToStaticMarkup(createElement(Home)));
  const opens = links.filter((a) => a.getAttribute("data-tool-slug"));
  assert.deepEqual(opens.map((a) => a.getAttribute("data-tool-slug")), ["stripe-cleaver", "license-gate"], "the two feed Opens are the only tool links on /");
  // Mirrors SiteTracker's "/" branch: home_click from data-home-target / path, then trackToolOpen on the closest a[data-tool-slug].
  const tapHome = (a) => {
    const target = homeClickTarget(a.getAttribute("data-home-target"), new URL(a.attrs.href, "https://alignata.com").pathname);
    if (target) sendSiteEvent(ids, "home_click", { target });
    trackToolOpen("/", a.getAttribute("data-tool-slug") ? a : null, ids, false);
  };
  for (const a of opens) {
    const slug = a.getAttribute("data-tool-slug");
    const sent = await captureBeacons(() => tapHome(a));
    assert.deepEqual(sent.map((x) => x.body.event), ["home_click", "tool_open"], `${slug}: both events`);
    assert.deepEqual(sent[0].body.props, { target: `tool:${slug}` }, `${slug}: home_click unchanged`);
    assert.deepEqual(sent[1].body.props, { slug, position: order.findIndex((x) => x.id === slug) + 1, source: "feed" }, `${slug}: tool_open source feed, /apps position`);
    for (const x of sent) assert.ok(validateSiteEvent(x.body).ok);
  }
  // Feed card bodies: exactly what they sent before (home_click for article cards; nothing for the tool card titles).
  const bodies = links.filter((a) => (a.attrs.class || "").split(" ").includes("fx-stretch"));
  assert.equal(bodies.length, 5);
  for (const a of bodies) {
    const sent = await captureBeacons(() => tapHome(a));
    const art = a.attrs.href.startsWith("/daily-digest/");
    assert.deepEqual(sent.map((x) => `${x.body.event}:${x.body.props.target}`), art ? [`home_click:article:${a.attrs.href.split("/")[2]}`] : [], `${a.attrs.href}: unchanged`);
  }
  // /apps row bodies → story: nothing.
  const rows = anchors(renderToStaticMarkup(createElement(ToolsList, { apps: order }))).filter((a) => a.attrs.class === "fx-stretch" && a.attrs.href.startsWith("/apps/"));
  const none = await captureBeacons(() => rows.forEach((a) => trackToolOpen("/apps", a.getAttribute("data-tool-slug") ? a : null, ids, false)));
  assert.equal(none.length, 0);
  // Skips unchanged on every surface; dogfood still flagged.
  const owner = shouldSkip({ webdriver: false, local: mem({ em_iid: OWNER }) });
  const skipped = await captureBeacons(() => { for (const p of ["/", "/apps", "/apps/stripe-cleaver"]) assert.equal(trackToolOpen(p, opens[0], ids, owner), false); });
  assert.equal(skipped.length, 0, "EXCLUDED_IIDS device: nothing on any surface");
  const dog = await captureBeacons(() => trackToolOpen("/", opens[0], { ...ids, dogfood: true }, false));
  assert.equal(dog[0].body.dogfood, true);
  // Wiring in the tracker.
  const { readFileSync } = await import("node:fs");
  const tracker = readFileSync("components/site/SiteTracker.tsx", "utf8");
  const home = tracker.slice(tracker.indexOf('if (location.pathname === "/") {'), tracker.indexOf("return;\n      }", tracker.indexOf('if (location.pathname === "/") {')));
  assert.ok(home.indexOf('sendSiteEvent(ids.current, "home_click", { target })') < home.indexOf("trackToolOpen(location.pathname"), "feed: home_click first, then tool_open");
  assert.equal((tracker.match(/trackToolOpen\(/g) || []).length, 2, "two call sites: / and the rest");
});

test("baseline: tool_open from every source (and legacy no-source) counts exactly as before; dogfood still excluded", () => {
  const T = Date.parse("2026-10-03T14:00:00Z");
  const ev = (event, sid, props = {}, extra = {}) => ({ v: 1, event, sid, vid: "v" + sid, dogfood: false, props, ts: T, day: "2026-10-03", host: "alignata.com", prod: true, ...extra });
  const events = [
    ev("page_view", "a", { path: "/apps" }), ev("apps_view", "a"),
    ev("tool_open", "a", { slug: "stripe-cleaver", position: 1, source: "apps" }),
    ev("tool_open", "b", { slug: "stripe-cleaver", position: 1, source: "feed" }),
    ev("tool_open", "c", { slug: "license-gate", position: 2, source: "story" }),
    ev("tool_open", "c", { slug: "license-gate", position: 2, source: "sticky" }),
    ev("tool_open", "d", { slug: "engrave-merge", position: 6 }),
    ev("tool_open", "z", { slug: "engrave-merge", position: 6, source: "feed" }, { dogfood: true }),
  ];
  const w = summarize(events, { until: T + 1 }).window;
  const legacy = summarize(events.map((e) => (e.event === "tool_open" ? { ...e, props: { slug: e.props.slug, position: e.props.position } } : e)), { until: T + 1 }).window;
  assert.equal(w.toolOpens, 5, "all sources count; dogfood excluded");
  assert.deepEqual(w, legacy, "the source tag changes no baseline number");
  assert.deepEqual(w.toolOpenBySlug, { "license-gate": 2, "stripe-cleaver": 2, "engrave-merge": 1 });
});

test("preview deploys don't store: VERCEL_ENV=preview → 204 skipped-preview, no KV write; production → stored", async () => {
  const saved = { ...process.env };
  const origFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (u) => (calls.push(String(u)), new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), { status: 200 }));
  const post = (body) => handleSiteEvent(new Request("https://alignata-git-x.vercel.app/api/site/e", { method: "POST", body }));
  try {
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "t";
    process.env.VERCEL_ENV = "preview";
    for (const [e, props] of [["page_view", { path: "/" }], ["tool_open", { slug: "stripe-cleaver", position: 1, source: "sticky" }], ["home_click", { target: "tool:stripe-cleaver" }]]) {
      const r = await post(JSON.stringify(env(e, props)));
      assert.equal(r.status, 204, `${e}: same success to the client`);
      assert.equal(await r.text(), "");
      assert.equal(r.headers.get("x-site-store"), "skipped-preview");
    }
    assert.equal((await post("nope")).status, 400, "still validated on preview");
    assert.equal(calls.length, 0, "preview: no KV write");
    for (const v of ["production", undefined, "development"]) {
      if (v === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = v;
      const r = await post(JSON.stringify(env("tool_open", { slug: "stripe-cleaver", position: 1, source: "apps" })));
      assert.equal(r.status, 204);
      assert.equal(r.headers.get("x-site-store"), "stored", `VERCEL_ENV=${v}: stored as before`);
    }
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = origFetch;
    process.env = saved;
  }
});

test("Daily Digest dates: every article card (home feed, /daily-digest, Next article) shows its date as 'Oct 2'", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { getPostsNewestFirst, getPost } = await import("../content/posts.ts");
  const { shortDate } = await import("../lib/daily-digest/meta.ts");
  assert.equal(shortDate("2026-10-02"), "Oct 2");
  assert.equal(shortDate("2026-09-28"), "Sep 28");
  const dated = (html, slug, date) =>
    new RegExp(`data-post-card="${slug}"[\\s\\S]*?<p class="fx-meta fx-scard-date"><time dateTime="${date}">${shortDate(date)}</time></p></div>`).test(html);
  const { default: Index } = await import("../app/daily-digest/page.tsx");
  const index = renderToStaticMarkup(createElement(Index));
  const list = getPostsNewestFirst();
  assert.equal((index.match(/fx-scard-date/g) || []).length, list.length, "one date per digest card");
  for (const p of list) assert.ok(dated(index, p.slug, p.date), `${p.slug}: dated on /daily-digest`);
  const { default: Home } = await import("../app/page.tsx");
  const home = renderToStaticMarkup(createElement(Home));
  const homeArticles = [...home.matchAll(/data-kind="article" data-post-card="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(homeArticles.length, 3);
  assert.equal((home.match(/fx-scard-date/g) || []).length, 3, "dates on article cards only, not tool cards");
  for (const slug of homeArticles) assert.ok(dated(home, slug, getPost(slug).date), `${slug}: dated on the home feed`);
  const { default: Article } = await import("../app/daily-digest/[slug]/page.tsx");
  const page = renderToStaticMarkup(await Article({ params: Promise.resolve({ slug: "break-loops-when-progress-stalls" }) }));
  const next = page.slice(page.indexOf("<h2>Next article</h2>"));
  const nextSlugs = [...next.matchAll(/data-post-card="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(nextSlugs.length >= 1);
  for (const slug of nextSlugs) assert.ok(dated(next, slug, getPost(slug).date), `${slug}: dated in Next article`);
});

test("Daily Digest kind + byline: default technique, AI Safety Paradox is an essay; byline under title+dek", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { posts, getPost } = await import("../content/posts.ts");
  const meta = await import("../lib/daily-digest/meta.ts");
  const author = await import("../lib/daily-digest/author.ts");
  assert.equal(meta.postKind(getPost("the-ai-safety-paradox")), "essay");
  assert.equal(meta.postKind(getPost("break-loops-when-progress-stalls")), "technique");
  assert.equal(meta.postKind({ ...getPost("break-loops-when-progress-stalls"), kind: undefined }), "technique", "no kind → technique");
  for (const p of posts) assert.equal(meta.postKind(p) === "essay", meta.postTag(p) === "Essay", `${p.slug}: kind essay ⇔ tag Essay`);
  assert.equal(author.TECHNIQUE_BYLINE, "Daily Digest · Edited by Osbel Morell");
  assert.equal(author.ESSAY_BYLINE, "By Osbel Morell");
  assert.ok(author.AUTHOR_BIO.length > 0, "bio is one constant (placeholder until approved; see test:release)");
  const { default: Article } = await import("../app/daily-digest/[slug]/page.tsx");
  const render = async (slug) => renderToStaticMarkup(await Article({ params: Promise.resolve({ slug }) }));
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  const essay = getPost("the-ai-safety-paradox");
  const ep = await render(essay.slug);
  const eOrder = [`<h1 class="fx-story-title">${essay.title}</h1>`, `<p class="fx-story-dek">${meta.postCardDek(essay)}</p>`,
    `<div class="fx-author" data-byline="essay"><p class="fx-author-name">By Osbel Morell</p><p class="fx-author-bio">${esc(author.AUTHOR_BIO)}</p></div>`,
    `Essay · <time dateTime="${essay.date}">${meta.shortDate(essay.date)}</time>`];
  let at = -1;
  for (const f of eOrder) { const i = ep.indexOf(f); assert.ok(i > at, `essay order: ${f}`); at = i; }
  assert.ok(!ep.includes("Edited by"), "essay has no edited-by line");
  for (const p of posts.filter((x) => meta.postKind(x) === "technique")) {
    const tp = await render(p.slug);
    const i = tp.indexOf('<div class="fx-author" data-byline="technique"><p class="fx-author-name">Daily Digest · Edited by Osbel Morell</p></div>');
    assert.ok(i > tp.indexOf('<p class="fx-story-dek">') && i < tp.indexOf("fx-story-meta") , `${p.slug}: technique byline after dek, before meta`);
    assert.ok(!tp.includes(esc(author.AUTHOR_BIO)), `${p.slug}: no bio on techniques`);
  }
});

test("Daily Digest JSON-LD: Article with datePublished; essay author Person, technique author Organization + editor Person", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { getPost } = await import("../content/posts.ts");
  const { articleJsonLd, jsonLdScript } = await import("../lib/daily-digest/jsonld.ts");
  const { default: Article } = await import("../app/daily-digest/[slug]/page.tsx");
  const ld = async (slug) => {
    const html = renderToStaticMarkup(await Article({ params: Promise.resolve({ slug }) }));
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    assert.equal(m?.length, 1, `${slug}: one JSON-LD script`);
    return JSON.parse(m[0].replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""));
  };
  const essay = getPost("the-ai-safety-paradox");
  const e = await ld(essay.slug);
  assert.equal(e["@context"], "https://schema.org");
  assert.equal(e["@type"], "Article");
  assert.equal(e.headline, essay.title);
  assert.equal(e.datePublished, essay.date);
  assert.equal(e.url, `https://alignata.com/daily-digest/${essay.slug}`);
  assert.equal(e.image, `https://alignata.com/art/digest/${essay.slug}-sticker.webp`);
  assert.deepEqual(e.author, { "@type": "Person", name: "Osbel Morell" });
  assert.equal(e.editor, undefined);
  const tech = getPost("break-loops-when-progress-stalls");
  const t = await ld(tech.slug);
  assert.equal(t.datePublished, "2026-10-02");
  assert.deepEqual(t.author, { "@type": "Organization", name: "Alignata Daily Digest", url: "https://alignata.com/daily-digest" });
  assert.deepEqual(t.editor, { "@type": "Person", name: "Osbel Morell" });
  assert.deepEqual(t, articleJsonLd(tech));
  const s = jsonLdScript({ x: "</script><!-- a & b" });
  assert.ok(!s.includes("<") && !s.includes(">") && !s.includes("&"), "escaped");
  assert.deepEqual(JSON.parse(s), { x: "</script><!-- a & b" });
});

/* ---------- Env Diff Snapshot retired (CEO, 8:25 AM ET Oct 3 2026) ---------- */

test("Env Diff retired page (COPY.md §8 via HANDOFF-ENVDIFF.md): H1 + one black pill to /apps, noindex/nofollow, no tool UI or textarea", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const mod = await import("../app/env-diff/page.tsx");
  assert.deepEqual(mod.metadata.robots, { index: false, follow: false }, "robots noindex, nofollow");
  assert.equal(mod.metadata.title, "Env Diff has been retired");
  assert.equal(mod.metadata.description, "Anything it saved on this device has been deleted.");
  const html = renderToStaticMarkup(createElement(mod.default));
  assert.ok(html.includes('<main class="fx-story fx-retired" data-retired="env-diff-snapshot"><article><div class="fx-story-col"><header class="fx-story-head"><h1 class="fx-story-title">Env Diff has been retired</h1></header>'), "story column, H1, no hero / eyebrow");
  assert.ok(!html.includes("fx-story-hero") && !html.includes("fx-eyebrow") && !/>Open</.test(html), "no hero, eyebrow or Open");
  const links = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].filter((m) => !html.slice(html.indexOf("<footer"), html.length).includes(m[0]));
  assert.deepEqual(links.map((m) => [m[1], m[2]]), [["/apps", "See the tools"]], "exactly one link in the page body: See the tools → /apps");
  assert.ok(html.includes('<div class="fx-retired-cta"><a class="fx-pill" href="/apps">See the tools</a></div>'), "the one black pill");
  assert.equal((html.match(/class="fx-pill"/g) || []).length, 1);
  assert.ok(!/<(textarea|input|button|select|form)\b/.test(html), "no tool UI");
  assert.ok(!/Diff snapshot|Load sample|Paste/i.test(html), "no tool copy");
  const visible = html.replace(/<footer[\s\S]*<\/footer>/, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  assert.equal(visible, "Env Diff has been retired See the tools", "server HTML: the H1 plus the pill; the deleted line is client-only");
  assert.ok(!html.includes("has been deleted") && !html.includes("data-storage-deleted"), "never server-rendered");
  const { readFileSync } = await import("node:fs");
  const chrome = readFileSync("components/HubChrome.tsx", "utf8");
  assert.match(chrome, /pathname === "\/env-diff"/, "the tool-route '← All tools' bar is hidden here (the page has its one Tools link)");
});

test("Env Diff storage cleanup: removes every key the tool wrote (exact + prefixed, local + session), keeps the rest, never throws", async () => {
  const { RETIRED_STORAGE_KEYS, RETIRED_STORAGE_PREFIXES, purgeRetiredKeys, cleanRetiredToolStorage } = await import("../lib/site/retired-storage.ts");
  assert.deepEqual([...RETIRED_STORAGE_KEYS], ["env-diff-snapshot:v0"]);
  assert.deepEqual([...RETIRED_STORAGE_PREFIXES], ["env-diff-snapshot:"], "HANDOFF-ENVDIFF.md §1");
  const mock = (entries) => {
    const m = new Map(Object.entries(entries));
    return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
  };
  const keep = { site_vid: "v", site_sid: "s", site_dogfood: "1", site_articles: "[]", em_iid: "i", "hobby-deploy-burn-digest:v0": "{}", "what-changed-card:v0": "{}", "agent-bundle-tag:v0": "{}", "llm-feature-cost-tag:v0": "{}", "agent-eval-go-no-go:v0": "{}" };
  const secret = JSON.stringify({ snapshots: [{ id: "env-diff-1" }], lastBefore: "API_KEY=sk_live_123", lastAfter: "DB_URL=postgres://u:p@h/d" });
  const local = mock({ ...keep, "env-diff-snapshot:v0": secret, "env-diff-snapshot:v1": "{}", "env-diff-snapshot:draft": "x" });
  const removed = purgeRetiredKeys(local);
  assert.deepEqual(removed.sort(), ["env-diff-snapshot:draft", "env-diff-snapshot:v0", "env-diff-snapshot:v1"]);
  assert.deepEqual(Object.fromEntries(local.m), keep, "every other key untouched");
  assert.ok(![...local.m.values()].some((v) => v.includes("sk_live_123")), "pasted secret text is gone");
  // exact key removed even when key() enumeration throws
  const blind = mock({ "env-diff-snapshot:v0": secret, site_vid: "v" });
  Object.defineProperty(blind, "length", { get() { throw new Error("denied"); } });
  purgeRetiredKeys(blind);
  assert.equal(blind.m.has("env-diff-snapshot:v0"), false);
  assert.equal(blind.m.get("site_vid"), "v");
  // removeItem throwing / null storage → no throw
  assert.doesNotThrow(() => purgeRetiredKeys({ length: 1, key: () => "env-diff-snapshot:v0", removeItem() { throw new Error("denied"); } }));
  assert.deepEqual(purgeRetiredKeys(null), []);
  // the page-load entry point cleans both areas and survives storage getters that throw
  const saved = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    const l = mock({ "env-diff-snapshot:v0": secret, site_vid: "v" });
    const s = mock({ "env-diff-snapshot:v0": "1", site_sid: "s", site_dogfood: "1", site_articles: "[]" });
    globalThis.window = { localStorage: l, sessionStorage: s };
    cleanRetiredToolStorage();
    assert.deepEqual(Object.fromEntries(l.m), { site_vid: "v" });
    assert.deepEqual(Object.fromEntries(s.m), { site_sid: "s", site_dogfood: "1", site_articles: "[]" });
    const writes = [];
    l.setItem = (k) => writes.push(k);
    cleanRetiredToolStorage();
    assert.deepEqual(writes, [], "the cleanup never writes");
    globalThis.window = { get localStorage() { throw new Error("SecurityError"); }, get sessionStorage() { throw new Error("SecurityError"); } };
    assert.doesNotThrow(() => cleanRetiredToolStorage());
  } finally {
    if (saved) Object.defineProperty(globalThis, "window", saved);
    else delete globalThis.window;
  }
});

test("Env Diff storage cleanup runs on /env-diff, / and /apps; no Env Diff writer code is left", async () => {
  const { readFileSync, existsSync, readdirSync } = await import("node:fs");
  const { join } = await import("node:path");
  const note = readFileSync("app/env-diff/page.tsx", "utf8");
  assert.match(note, /import \{ RetiredToolNote, RETIRED_DELETED_LINE \} from "@\/components\/site\/RetiredToolNote";/);
  assert.match(note, /<RetiredToolNote \/>/, "/env-diff wipes via its note component");
  for (const f of ["app/page.tsx", "app/apps/page.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /import \{ RetiredStorageCleanup \} from "@\/components\/site\/RetiredStorageCleanup";/, `${f} imports the cleanup`);
    assert.match(src, /<RetiredStorageCleanup \/>/, `${f} renders the cleanup`);
  }
  assert.match(readFileSync("components/site/RetiredStorageCleanup.tsx", "utf8"), /useEffect\(\(\) => \{\n\s+cleanRetiredToolStorage\(\);\n\s+\}, \[\]\);/, "once per load");
  for (const d of ["components/env-diff", "lib/env-diff"]) assert.ok(!existsSync(d), `${d} removed`);
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|mjs|js)$/.test(e.name) && /env-diff[^"']*["'`]/.test(readFileSync(p, "utf8")) && /setItem/.test(readFileSync(p, "utf8"))) hits.push(p);
    }
  };
  for (const d of ["app", "components", "lib"]) walk(d);
  assert.deepEqual(hits, [], "nothing writes an env-diff key");
});

test("Env Diff unlisted: not in apps.json, /apps, the feed, stories or the sitemap; story → 301 /env-diff; positions 1–10 contiguous", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { readFileSync } = await import("node:fs");
  const catalog = JSON.parse(readFileSync("public/apps.json", "utf8"));
  assert.ok(!catalog.apps.some((a) => a.id === "env-diff-snapshot" || a.url === "/env-diff"), "apps.json");
  assert.equal(catalog.apps.length, 10);
  const { getApps, toolsOrder, TOOL_ART, TOOL_STORY } = await import("../lib/apps.ts");
  const { TOOL_ABOUT } = await import("../lib/tool-about.ts");
  for (const [name, m] of [["TOOL_ART", TOOL_ART], ["TOOL_STORY", TOOL_STORY], ["TOOL_ABOUT", TOOL_ABOUT]]) assert.ok(!("env-diff-snapshot" in m), `${name}`);
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const { default: Home } = await import("../app/page.tsx");
  const order = toolsOrder(getApps());
  for (const [where, html] of [["/apps", renderToStaticMarkup(createElement(ToolsList, { apps: order }))], ["/", renderToStaticMarkup(createElement(Home))]]) {
    assert.ok(!/env-diff|Env Diff/i.test(html), `${where}: no Env Diff`);
  }
  const apps = renderToStaticMarkup(createElement(ToolsList, { apps: order }));
  const pos = [...apps.matchAll(/data-slug="([^"]+)" data-pos="(\d+)"/g)].map((m) => [m[1], +m[2]]);
  assert.deepEqual(pos.map((p) => p[1]), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "positions contiguous");
  assert.deepEqual(pos.slice(7), [["hobby-deploy-burn-digest", 8], ["llm-feature-cost-tag", 9], ["what-changed-card", 10]]);
  for (const [slug, p] of pos) {
    for (const m of apps.matchAll(new RegExp(`data-tool-slug="${slug}" data-tool-pos="(\\d+)"`, "g"))) assert.equal(+m[1], p, `${slug}: tracked position = row shown`);
  }
  const stories = (await import("../app/apps/[slug]/page.tsx")).generateStaticParams().map((s) => s.slug);
  assert.ok(!stories.includes("env-diff-snapshot"), "no story page");
  const urls = (await import("../app/sitemap.ts")).default().map((e) => e.url);
  assert.ok(!urls.some((u) => /env-diff/.test(u)), "sitemap");
  const redirects = await (await import("../next.config.ts")).default.redirects();
  assert.deepEqual(redirects.find((r) => r.source === "/apps/env-diff-snapshot"), { source: "/apps/env-diff-snapshot", destination: "/env-diff", statusCode: 301 }, "old story → the retired route (UX Lead)");
  assert.ok(!redirects.some((r) => r.source === "/env-diff"), "/env-diff itself stays reachable (retired page)");
});

test("Env Diff: validator unchanged (slug pattern, no allow-list), so historical env-diff tool_open events still validate and count", () => {
  const r = validateSiteEvent({ v: 1, event: "tool_open", sid: SID, vid: VID, dogfood: false, props: { slug: "env-diff-snapshot", position: 8 } });
  assert.equal(r.ok, true);
  const T = Date.parse("2026-10-02T19:30:00Z");
  const ev = (event, props) => ({ v: 1, event, sid: "s1", vid: "v1", dogfood: false, props, ts: T, day: "2026-10-02", host: "alignata.com", prod: true });
  const s = summarize([ev("page_view", { path: "/apps" }), ev("apps_view", {}), ev("tool_open", { slug: "env-diff-snapshot", position: 8 }), ev("tool_open", { slug: "hobby-deploy-burn-digest", position: 9 })], {});
  assert.deepEqual(s.window.toolOpenBySlug, { "env-diff-snapshot": 1, "hobby-deploy-burn-digest": 1 });
});

test("Env Diff 'has been deleted' line: client-only, rendered only after the synchronous wipe completed", async () => {
  const { readFileSync } = await import("node:fs");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { wipeThenConfirm } = await import("../lib/site/retired-storage.ts");
  const { RetiredToolNote, RETIRED_DELETED_LINE } = await import("../components/site/RetiredToolNote.tsx");
  assert.equal(RETIRED_DELETED_LINE, "Anything it saved on this device has been deleted.");
  assert.match(readFileSync("components/site/RetiredToolNote.tsx", "utf8"), /<p className="fx-story-dek" data-storage-deleted="">\s*\{RETIRED_DELETED_LINE\}/, "rendered as the story dek");
  assert.equal(renderToStaticMarkup(createElement(RetiredToolNote)), "", "nothing on the server");
  const log = [];
  const store = new Map([["env-diff-snapshot:v0", "API_KEY=sk"]]);
  wipeThenConfirm(() => { log.push("wipe"); store.delete("env-diff-snapshot:v0"); return true; }, (v) => log.push(`reveal:${v}:${store.size}`));
  assert.deepEqual(log, ["wipe", "reveal:true:0"], "reveal after the wipe returns, with the key already gone");
  const none = [];
  wipeThenConfirm(() => false, (v) => none.push(v));
  assert.deepEqual(none, [], "no 'deleted' line when the wipe couldn't be verified (storage blocked)");
  const src = readFileSync("components/site/RetiredToolNote.tsx", "utf8");
  assert.match(src, /^"use client";/);
  assert.match(src, /useState\(false\)/, "starts hidden");
  assert.match(src, /useLayoutEffect\(\(\) => \{\n\s+wipeThenConfirm\(cleanRetiredToolStorage, setDeleted\);\n\s+\}, \[\]\);/, "wipe then set state, in a layout effect");
  // cleanRetiredToolStorage reports completion only when it can verify both areas are clean
  const { cleanRetiredToolStorage } = await import("../lib/site/retired-storage.ts");
  const mock = (entries) => { const m = new Map(Object.entries(entries)); return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), removeItem: (k) => m.delete(k), m }; };
  const saved = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    globalThis.window = { localStorage: mock({ "env-diff-snapshot:v0": "x" }), sessionStorage: mock({}) };
    assert.equal(cleanRetiredToolStorage(), true);
    const stuck = mock({ "env-diff-snapshot:v0": "x" }); stuck.removeItem = () => { throw new Error("denied"); };
    globalThis.window = { localStorage: stuck, sessionStorage: mock({}) };
    assert.equal(cleanRetiredToolStorage(), false, "a key that wouldn't delete → no 'deleted' line");
    globalThis.window = { get localStorage() { throw new Error("SecurityError"); }, sessionStorage: mock({}) };
    assert.equal(cleanRetiredToolStorage(), false);
  } finally {
    if (saved) Object.defineProperty(globalThis, "window", saved); else delete globalThis.window;
  }
});

test("Env Diff route: zero links to /env-diff on /, /apps, every tool story and every Digest page; not in the sitemap", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { getApps, toolsOrder } = await import("../lib/apps.ts");
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const { default: Home } = await import("../app/page.tsx");
  const story = await import("../app/apps/[slug]/page.tsx");
  const { default: Digest } = await import("../app/daily-digest/page.tsx");
  const { default: Article } = await import("../app/daily-digest/[slug]/page.tsx");
  const { posts } = await import("../content/posts.ts");
  const pages = [["/", renderToStaticMarkup(createElement(Home))], ["/apps", renderToStaticMarkup(createElement(ToolsList, { apps: toolsOrder(getApps()) }))], ["/daily-digest", renderToStaticMarkup(createElement(Digest))]];
  for (const { slug } of story.generateStaticParams()) pages.push([`/apps/${slug}`, renderToStaticMarkup(await story.default({ params: Promise.resolve({ slug }) }))]);
  for (const p of posts) pages.push([`/daily-digest/${p.slug}`, renderToStaticMarkup(await Article({ params: Promise.resolve({ slug: p.slug }) }))]);
  assert.equal(pages.length, 3 + 9 + 24);
  for (const [path, html] of pages) {
    assert.ok(!/href="[^"]*\/env-diff/.test(html), `${path}: no link to the Env Diff route`);
    assert.ok(!/env-diff|Env Diff/i.test(html), `${path}: no Env Diff mention or art`);
  }
  const urls = (await import("../app/sitemap.ts")).default().map((e) => e.url);
  assert.ok(!urls.some((u) => u.includes("env-diff")));
});

test("Env Diff head wipe: a blocking inline script first in <head> clears the keys on /env-diff only, before <body>", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const { RETIRED_WIPE_INLINE_SCRIPT } = await import("../lib/site/retired-storage.ts");
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /<head>\s*\{\/\*[^*]*\*\/\}\s*<script dangerouslySetInnerHTML=\{\{ __html: RETIRED_WIPE_INLINE_SCRIPT \}\} \/>\s*<\/head>\s*<body/, "inline, synchronous, in <head> before <body>");
  assert.ok(!/src=|async|defer/.test(RETIRED_WIPE_INLINE_SCRIPT.slice(0, 40)));
  const mock = (entries) => { const m = new Map(Object.entries(entries)); return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, removeItem: (k) => m.delete(k), m }; };
  const run = (pathname, local, session) => runInNewContext(RETIRED_WIPE_INLINE_SCRIPT, { location: { pathname }, window: { localStorage: local, sessionStorage: session } });
  const keep = { site_vid: "v", em_iid: "i", "hobby-deploy-burn-digest:v0": "{}" };
  for (const path of ["/env-diff", "/env-diff/"]) {
    const l = mock({ ...keep, "env-diff-snapshot:v0": "API_KEY=sk", "env-diff-snapshot:v1": "x" });
    const s = mock({ site_sid: "s", site_dogfood: "1", site_articles: "[]", "env-diff-snapshot:v0": "x" });
    run(path, l, s);
    assert.deepEqual(Object.fromEntries(l.m), keep, `${path}: local wiped, rest kept`);
    assert.deepEqual(Object.fromEntries(s.m), { site_sid: "s", site_dogfood: "1", site_articles: "[]" }, `${path}: session wiped, site keys kept`);
  }
  const other = mock({ "env-diff-snapshot:v0": "x" });
  run("/apps", other, mock({}));
  assert.equal(other.m.size, 1, "the head script acts on /env-diff only (/ and /apps clean up after hydration)");
  assert.doesNotThrow(() => runInNewContext(RETIRED_WIPE_INLINE_SCRIPT, { location: { pathname: "/env-diff" }, window: { get localStorage() { throw new Error("SecurityError"); }, sessionStorage: null } }));
});

/* ---------- Art + alt text (Product UI, Oct 3 2026) ---------- */

const imgsWithoutAlt = (html) => [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((tag) => !/\salt="[^"]*\S[^"]*"/.test(tag));

test("alt text: no <img> anywhere on the site has an empty or missing alt (every page rendered)", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { readdirSync, existsSync } = await import("node:fs");
  const { getApps, toolsOrder } = await import("../lib/apps.ts");
  const { posts } = await import("../content/posts.ts");
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const story = await import("../app/apps/[slug]/page.tsx");
  const { default: Article } = await import("../app/daily-digest/[slug]/page.tsx");
  const pages = [];
  const add = (path, html) => pages.push([path, html]);
  add("/", renderToStaticMarkup(createElement((await import("../app/page.tsx")).default)));
  add("/apps", renderToStaticMarkup(createElement(ToolsList, { apps: toolsOrder(getApps()) })));
  add("/daily-digest", renderToStaticMarkup(createElement((await import("../app/daily-digest/page.tsx")).default)));
  for (const { slug } of story.generateStaticParams()) add(`/apps/${slug}`, renderToStaticMarkup(await story.default({ params: Promise.resolve({ slug }) })));
  for (const p of posts) add(`/daily-digest/${p.slug}`, renderToStaticMarkup(await Article({ params: Promise.resolve({ slug: p.slug }) })));
  // every other top-level route (tool routes, the retired /env-diff page)
  for (const d of readdirSync("app", { withFileTypes: true })) {
    if (!d.isDirectory() || ["apps", "daily-digest", "api"].includes(d.name) || !existsSync(`app/${d.name}/page.tsx`)) continue;
    const m = await import(`../app/${d.name}/page.tsx`);
    add(`/${d.name}`, renderToStaticMarkup(await m.default({})));
  }
  assert.ok(pages.length >= 3 + 9 + 24 + 11, `pages rendered: ${pages.length}`);
  let imgs = 0;
  for (const [path, html] of pages) {
    imgs += (html.match(/<img\b/g) || []).length;
    assert.deepEqual(imgsWithoutAlt(html), [], `${path}: every <img> has a non-empty alt`);
  }
  assert.ok(imgs > 100, `images checked: ${imgs}`);
  assert.deepEqual(imgsWithoutAlt('<img src="a.webp" alt="">'), ['<img src="a.webp" alt="">'], "self-check: empty alt is caught");
  assert.deepEqual(imgsWithoutAlt('<img src="a.webp">'), ['<img src="a.webp">'], "self-check: missing alt is caught");
});

test("alt text: every listed tool hero + icon and all 24 Digest heroes carry their FINAL (non-empty) alt", async () => {
  const { getApps, toolsOrder, toolArt } = await import("../lib/apps.ts");
  const { posts } = await import("../content/posts.ts");
  let heroes = 0, icons = 0;
  for (const a of toolsOrder(getApps())) {
    const t = toolArt(a.id);
    assert.ok(t.iconAlt.trim(), `${a.id}: icon alt`);
    icons++;
    if (t.art) { assert.ok(t.alt.trim(), `${a.id}: hero alt`); heroes++; }
    else assert.equal(a.id, "deploy-decision-card", "only Deploy Decision is icon-only");
  }
  assert.deepEqual([heroes, icons], [9, 10]);
  assert.equal(toolArt("agent-eval-go-no-go").alt, "A black and white checkered flag waving on a pole.", "Agent Eval: 'checkered'");
  assert.equal(posts.length, 24);
  for (const p of posts) assert.ok(p.hero.alt.trim(), `${p.slug}: hero alt`);
});

test("Digest heroes #3, #4, #8, #21: the current sticker files (not .v2), 1920×1080, pad = palette.json colour", async () => {
  const { createHash } = await import("node:crypto");
  const { readFileSync, existsSync } = await import("node:fs");
  const { getPost } = await import("../content/posts.ts");
  const want = {
    "the-ai-safety-paradox": ["56f842e310dd4c9f26e07f6f3ac4a3bca7da239ce075f908193ca555a3f88749", "#F0CD5F"],
    "ask-before-doing-what-wasnt-asked": ["0e9310cfb6c542870776529de3df358c62f8edd45118da70f840e4b467b26a23", "#EE83C3"],
    "refuse-answers-sources-do-not-support": ["8e881972b6b1b488d6f903fc530f9be94b553bfac985ebc322bc8e2ae2ccc74c", "#F0CD5F"],
    "compare-models-only-under-a-locked-setup": ["ca591e9604e83c65aaf648c601f77fdd1fafd111c8bd35230d070b7894a04074", "#96E4B7"],
  };
  for (const [slug, [sha, pad]] of Object.entries(want)) {
    const f = `public/art/digest/${slug}-sticker.webp`;
    assert.equal(createHash("sha256").update(readFileSync(f)).digest("hex"), sha, `${slug}: mockups-art/art/digest/${slug}-sticker.webp, byte for byte`);
    assert.deepEqual(await webpSize(f), [1920, 1080]);
    assert.equal(getPost(slug).hero.pad, pad, `${slug}: pad = palette.json`);
    assert.ok(!existsSync(`public/art/digest/${slug}.v2.webp`) && !existsSync(`public/art/digest/${slug}-sticker.v2.webp`), "no .v2 file");
  }
});

/* ---------- Guides /guides/<slug> (CEO + Product Copy GUIDES.md FINAL v2, Oct 3 2026) ---------- */

const GUIDE_LB = "lightburn-variable-text-etsy-csv";
const GUIDE_ETSY = "etsy-download-orders-csv-personalization";

test("guides content: both FINAL guides (GUIDES.md v2) published, slugs, H1s, deks, cross-links, sample link; no 'blog'", async () => {
  const { readFileSync, readdirSync, existsSync } = await import("node:fs");
  const { getGuides } = await import("../lib/guides/guides.ts");
  const gs = getGuides();
  assert.deepEqual(gs.map((g) => [g.slug, g.title, g.draft, g.tool, g.datePublished]), [
    [GUIDE_ETSY, "How to download Etsy orders as a CSV, with personalization", false, "engrave-merge", "2026-10-03"],
    [GUIDE_LB, "LightBurn Variable Text from an Etsy order CSV", false, "engrave-merge", "2026-10-03"],
  ].sort((a, b) => a[0].localeCompare(b[0])));
  const lb = gs.find((g) => g.slug === GUIDE_LB), etsy = gs.find((g) => g.slug === GUIDE_ETSY);
  assert.equal(lb.dek, "Engrave every buyer's name from one file, instead of typing each order into LightBurn.");
  assert.equal(etsy.dek, "Where Etsy keeps what each buyer asked you to write: the Order Items file.");
  assert.ok(lb.body.includes('- Your Etsy "Order Items" file. [How to download Etsy orders as a CSV](/guides/etsy-download-orders-csv-personalization) shows where to find it.'), "guide 1 → guide 2 (Product Copy fix)");
  assert.ok(etsy.body.includes("To set up LightBurn, follow [LightBurn Variable Text from an Etsy order CSV](/guides/lightburn-variable-text-etsy-csv)."), "guide 2 → guide 1");
  for (const g of gs) {
    assert.ok(g.body.endsWith("[Download a sample Order Items file](/fixtures/engrave-merge/sample.csv)"), `${g.slug}: sample link last, no ref`);
    assert.ok(!/\[SLUG-GUIDE|\[DATE\]|App row:/.test(g.body), `${g.slug}: no placeholders or notes left`);
  }
  assert.ok(existsSync("public/fixtures/engrave-merge/sample.csv"), "the existing Engrave Merge sample fixture");
  const files = ["app/guides/[slug]/page.tsx", "lib/guides/guides.ts", "lib/guides/markdown.ts", "components/guides/GuideBody.tsx", "components/guides/GuidesLinks.tsx", ...readdirSync("content/guides").map((f) => `content/guides/${f}`)];
  for (const f of files) assert.ok(!/blog/i.test(f + readFileSync(f, "utf8")), `${f}: never 'blog'`);
});

test("guide page: Digest story template (680 column, no hero), byline 'Alignata · Guide · Oct 3', prose, ONE Engrave Merge app row → plain /engrave-merge (no ?ref=), JSON-LD Organization", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { getApps } = await import("../lib/apps.ts");
  const mod = await import("../app/guides/[slug]/page.tsx");
  assert.deepEqual(mod.generateStaticParams().map((p) => p.slug).sort(), [GUIDE_ETSY, GUIDE_LB].sort());
  const em = getApps().find((a) => a.id === "engrave-merge");
  assert.equal(em.blurb, "Turn Etsy orders into a LightBurn file, ready to engrave.", "live apps.json blurb");
  for (const slug of [GUIDE_LB, GUIDE_ETSY]) {
    const html = renderToStaticMarkup(await mod.default({ params: Promise.resolve({ slug }) }));
    const meta = await mod.generateMetadata({ params: Promise.resolve({ slug }) });
    assert.equal(meta.robots, undefined, `${slug}: published → no robots override (indexable on production)`);
    assert.equal(meta.alternates.canonical, `/guides/${slug}`);
    assert.ok(html.includes(`<main class="fx-story fx-guide" data-guide="${slug}">`) && !html.includes("data-draft"));
    assert.ok(!html.includes("fx-story-hero") && !html.includes("fx-eyebrow"), "no hero, no eyebrow");
    const order = ['<h1 class="fx-story-title">', '<p class="fx-story-dek">', '<p class="fx-meta fx-story-meta"><span>Alignata · Guide · <time dateTime="2026-10-03">Oct 3</time></span></p>', '<div class="fx-prose">', "<h2>", '<div class="fx-story-end">'];
    let at = -1;
    for (const f of order) { const i = html.indexOf(f); assert.ok(i > at, `${slug} order: ${f}`); at = i; }
    assert.ok(!/Osbel/.test(html), "byline is just Alignata");
    assert.equal((html.match(/class="fx-app-row/g) || []).length, 1, "ONE app row");
    assert.equal((html.match(/fx-primary/g) || []).length, 1, "one black pill");
    assert.ok(html.includes(`<p class="fx-app-name">Engrave Merge</p><p class="fx-app-line">${em.blurb}</p>`));
    assert.ok(html.includes('src="/art/engrave-merge-sticker-icon.webp" alt="A laser engraver burning a line onto a tag."'), "Engrave Merge icon + FINAL alt");
    assert.match(html, new RegExp(`<a class="fx-open fx-primary" href="/engrave-merge" data-tool-slug="engrave-merge" data-tool-pos="6" data-tool-src="guide" aria-label="Open Engrave Merge">Open</a>`));
    assert.ok(html.includes('<a href="/fixtures/engrave-merge/sample.csv" download="">Download a sample Order Items file</a>'), "sample: plain download, no ref");
    assert.ok(!/[?&]ref=/.test(html), "no ?ref= anywhere on the page (ref tag dropped from this release)");
    assert.deepEqual(imgsWithoutAlt(html), [], `${slug}: every <img> has an alt`);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(ld.author, { "@type": "Organization", name: "Alignata", url: "https://alignata.com" });
    assert.equal(ld["@type"], "Article");
    assert.equal(ld.datePublished, "2026-10-03");
    assert.equal(ld.url, `https://alignata.com/guides/${slug}`);
  }
  const lb = renderToStaticMarkup(await mod.default({ params: Promise.resolve({ slug: GUIDE_LB }) }));
  assert.ok(lb.includes("<li>Your Etsy &quot;Order Items&quot; file. <a href=\"/guides/etsy-download-orders-csv-personalization\">How to download Etsy orders as a CSV</a><span> shows where to find it.</span></li>") || lb.includes('href="/guides/etsy-download-orders-csv-personalization">How to download Etsy orders as a CSV</a>'), "cross-link renders");
  assert.ok(lb.includes("<code>%11</code>") && lb.includes("<strong>One item per run:</strong>"), "inline code + bold");
  assert.ok(lb.includes('<a href="https://docs.lightburnsoftware.com/latest/Reference/VariableText/" rel="noopener">LightBurn&#x27;s Variable Text guide</a>'));
  assert.ok(lb.includes("<h2>What you need</h2>") && lb.includes('<ol start="1"'), "### → h2, numbered steps");
});

test("guides: draft vs published (fixtures): drafts render noindex, out of sitemap, unlinked; published → sitemap with lastmod + Guides block", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { loadGuides, guideSitemapEntries, guideMetadata, publishedGuides } = await import("../lib/guides/guides.ts");
  const { GuidesLinks } = await import("../components/guides/GuidesLinks.tsx");
  const draftOnly = loadGuides("scripts/__fixtures__/guides-draft-only");
  const mixed = loadGuides("scripts/__fixtures__/guides-mixed");
  assert.deepEqual(draftOnly.map((g) => [g.slug, g.draft]), [["fixture-draft-guide", true]]);
  // draft-only: nothing anywhere
  assert.deepEqual(guideMetadata(draftOnly[0]).robots, { index: false, follow: false }, "draft → noindex, nofollow");
  assert.deepEqual(guideSitemapEntries(draftOnly), [], "draft → not in the sitemap");
  assert.equal(renderToStaticMarkup(createElement(GuidesLinks, { tool: "engrave-merge", guides: draftOnly })), "", "no published guide → the block renders nothing");
  // mixed: only the published one is listed / in the sitemap
  assert.deepEqual(publishedGuides(mixed).map((g) => g.slug), ["fixture-published-guide"]);
  assert.equal(guideMetadata(mixed.find((g) => !g.draft)).robots, undefined);
  assert.deepEqual(guideSitemapEntries(mixed), [{ url: "https://alignata.com/guides/fixture-published-guide", lastModified: "2026-10-06" }], "lastmod = updated, else datePublished");
  const block = renderToStaticMarkup(createElement(GuidesLinks, { tool: "engrave-merge", guides: mixed }));
  assert.equal(block, '<nav class="fx-guides" aria-label="Guides" data-guides="engrave-merge"><h2>Guides</h2><ul><li><a class="fx-text-link" href="/guides/fixture-published-guide">Fixture published guide</a></li></ul></nav>');
  assert.ok(!block.includes("fixture-draft-guide"), "drafts never linked");
  assert.equal(renderToStaticMarkup(createElement(GuidesLinks, { tool: "stripe-cleaver", guides: mixed })), "", "only the guide's own tool");
  // bad files fail the build
  const { parseGuide } = await import("../lib/guides/guides.ts");
  assert.throws(() => parseGuide("x", "no frontmatter"));
  assert.throws(() => parseGuide("x", '---\ntitle: "t"\ndek: d\ndatePublished: 2026-10-03\ndraft: maybe\ntool: t\nref: r\n---\nb'), /draft/);
  assert.throws(() => parseGuide("Bad_Slug", '---\ntitle: "t"\ndek: d\ndatePublished: 2026-10-03\ndraft: true\ntool: t\nref: r\n---\nb'), /kebab/);
});

test("guides live state: sitemap has both with lastmod; the Engrave Merge story lists both; nothing else links a guide", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const entries = (await import("../app/sitemap.ts")).default().filter((e) => e.url.includes("/guides/"));
  assert.deepEqual(entries.map((e) => [e.url.replace("https://alignata.com", ""), e.lastModified]).sort(), [[`/guides/${GUIDE_ETSY}`, "2026-10-03"], [`/guides/${GUIDE_LB}`, "2026-10-03"]]);
  const story = await import("../app/apps/[slug]/page.tsx");
  for (const { slug } of story.generateStaticParams()) {
    const html = renderToStaticMarkup(await story.default({ params: Promise.resolve({ slug }) }));
    const links = [...html.matchAll(/href="(\/guides\/[^"]+)"/g)].map((m) => m[1]);
    if (slug === "engrave-merge") {
      assert.deepEqual(links.sort(), [`/guides/${GUIDE_ETSY}`, `/guides/${GUIDE_LB}`].sort());
      assert.ok(html.indexOf('<nav class="fx-guides"') < html.indexOf('<div class="fx-story-end">'), "block after the About body, before the end row");
    } else assert.deepEqual(links, [], `${slug}: no Guides block`);
  }
  const { default: Home } = await import("../app/page.tsx");
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const { getApps, toolsOrder } = await import("../lib/apps.ts");
  for (const html of [renderToStaticMarkup(createElement(Home)), renderToStaticMarkup(createElement(ToolsList, { apps: toolsOrder(getApps()) }))]) assert.ok(!html.includes("/guides/"));
});

test("guides tracking: the guide Open counts as tool_open {slug, position, source: guide}; validator stays backwards-compatible", () => {
  assert.equal(toolOpenPage(`/guides/${GUIDE_LB}`), true);
  assert.equal(toolOpenPage("/guides"), false);
  assert.equal(toolOpenSource(`/guides/${GUIDE_LB}`, "guide"), "guide");
  assert.equal(toolOpenSource(`/guides/${GUIDE_LB}`, null), "guide", "derived from the page");
  for (const s of ["feed", "apps", "story", "sticky", "guide"]) assert.ok(validateSiteEvent(env("tool_open", { slug: "engrave-merge", position: 6, source: s })).ok, s);
  assert.ok(validateSiteEvent(env("tool_open", { slug: "engrave-merge", position: 6 })).ok, "no source still fine");
  assert.ok(validateSiteEvent(env("page_view", { path: `/guides/${GUIDE_LB}` })).ok, "page_view path");
});

test("ref tag dropped from this release: no ref=guide- / em_ref anywhere in app, components, lib, content, public", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const files = ["app", "components", "lib", "content", "public"].flatMap(walk).filter((f) => /\.(tsx?|mjs|js|md|json|css|html|txt)$/.test(f));
  for (const f of files) assert.ok(!/ref=guide-|em_ref/.test(readFileSync(f, "utf8")), `${f}: no guide ref tag`);
});

test("Google Search Console: root layout metadata carries the exact verification token; built home page has the exact meta tag in <head>", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const TOKEN = "hpF74ucSQwpql4ug5WHk_go4bnnz4rfUMzfdPM7xcRs";
  const TAG = `<meta name="google-site-verification" content="${TOKEN}"/>`;
  const src = readFileSync("app/layout.tsx", "utf8");
  assert.equal((src.match(/verification: \{ google: "([^"]+)" \}/) || [])[1], TOKEN, "metadata.verification.google is the exact token");
  assert.equal(src.split("google-site-verification").length - 1, 0, "set through metadata only (no hand-written tag)");
  // After `npm run build`: the prerendered home page has exactly one such tag, inside <head>.
  const built = ".next/server/app/index.html";
  if (existsSync(built)) {
    const html = readFileSync(built, "utf8");
    const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
    assert.equal(head.split(TAG).length - 1, 1, `exactly one ${TAG} in <head>`);
    assert.equal((html.match(/<meta name="google-site-verification"/g) || []).length, 1, "no second verification meta tag anywhere");
  }
});

/* ---------- Company pages (SPEC v1 + COPY.md v4 FINAL + Split release notes, Oct 3 2026) ---------- */

const MISSION_TXT = "Alignata builds small, sharp tools that take busy work off people&#x27;s plates, so they get their time back.";
const companyHtml = async (route) => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const m = await import(`../app${route === "/" ? "" : route}/page.tsx`);
  return renderToStaticMarkup(createElement(m.default));
};
const footerOf = (html) => html.slice(html.indexOf('<footer class="fx-footer">'), html.indexOf("</footer>") + 9);

test("homepage mission: the dek sits directly under the locked display line and above the two pills; nothing else added", async () => {
  const html = await companyHtml("/");
  const head = html.slice(html.indexOf('<section class="fx-home-head"'), html.indexOf('<section class="fx-feed"'));
  assert.equal(
    head,
    '<section class="fx-home-head" aria-label="Start"><h1 class="fx-display">Small tools for busy people, and AI techniques in plain English.</h1>' +
      `<p class="fx-story-dek fx-home-dek">${MISSION_TXT}</p>` +
      '<div class="fx-home-cta"><a class="fx-pill" data-home-target="tools-pill" href="/apps">Tools</a><a class="fx-pill fx-pill-outline" data-home-target="digest-pill" href="/daily-digest">Daily Digest</a></div></section>',
  );
});

test("footer: '© 2026 Alignata', links Tools · Daily Digest · About · Privacy, identical on every page that has it; home_click targets validate", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { SiteFooter } = await import("../components/fantasy/SiteFooter.tsx");
  const { FOOTER_LINKS } = await import("../content/company.ts");
  const f = renderToStaticMarkup(createElement(SiteFooter));
  assert.equal(
    f,
    '<footer class="fx-footer"><div class="fx-wrap"><p class="fx-footer-co">© 2026 Alignata</p><nav aria-label="Footer" class="fx-footer-nav">' +
      '<a data-home-target="nav:footer-tools" href="/apps">Tools</a><a data-home-target="nav:footer-daily-digest" href="/daily-digest">Daily Digest</a>' +
      '<a data-home-target="nav:footer-about" href="/about">About</a><a data-home-target="nav:footer-privacy" href="/privacy">Privacy</a></nav></div></footer>',
  );
  assert.ok(!/Build tools for busy humans|\[LEGAL ENTITY NAME\]|Terms|\/terms/.test(f), "old line gone; no entity placeholder; Terms held");
  for (const l of FOOTER_LINKS) {
    assert.ok(validateSiteEvent(env("home_click", { target: l.target })).ok, `${l.target} is a valid home_click target`);
    assert.equal(homeClickTarget(l.target, l.href), l.target, "explicit target wins (never derived as tool:about)");
  }
  for (const route of ["/", "/about", "/privacy", "/env-diff"]) assert.equal(footerOf(await companyHtml(route)), f, `${route}: the same footer`);
});

test("footer on every page: tool routes and the 404 end with the same SiteFooter, after </main> (HANDOFF-PRICE-CARD §1.8)", async () => {
  const { readFileSync, readdirSync, existsSync } = await import("node:fs");
  const tools = readdirSync("app", { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`app/${d.name}/page.tsx`) && readFileSync(`app/${d.name}/page.tsx`, "utf8").includes('className="fx-toolroute'))
    .map((d) => d.name)
    .sort();
  assert.deepEqual(tools, ["agent-bundle", "agent-eval", "deploy-decision", "engrave-merge", "feature-cost", "hobby-burn", "license-gate", "scorecard", "stripe-cleaver", "what-changed"]);
  for (const t of tools) {
    const src = readFileSync(`app/${t}/page.tsx`, "utf8");
    assert.match(src, /<\/main>\n\s+<SiteFooter \/>\n\s+<\/>/, `/${t}: SiteFooter right after </main>`);
    assert.equal((src.match(/<SiteFooter \/>/g) || []).length, 1, `/${t}: one footer`);
  }
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { SiteFooter } = await import("../components/fantasy/SiteFooter.tsx");
  const nf = renderToStaticMarkup(createElement((await import("../app/not-found.tsx")).default));
  assert.ok(nf.endsWith(renderToStaticMarkup(createElement(SiteFooter))), "404: the same footer, last");
  assert.ok(nf.includes("This page could not be found."));
});

test("/about (COPY.md §3): story template, one sticker hero with alt, H1, mission dek, body verbatim, Built by, ONE black pill → /apps", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const html = await companyHtml("/about");
  const mod = await import("../app/about/page.tsx");
  assert.equal(mod.metadata.title, "About");
  assert.equal(mod.metadata.alternates.canonical, "/about");
  assert.ok(html.includes('<main class="fx-story fx-company" data-page="about"><article><figure class="fx-story-hero" style="--art-pad:#C5C6FB" data-art="about"><img src="/art/about-sticker.webp" alt="A handsaw with a red handle resting on a pale wooden plank." width="1920" height="1080"'));
  const order = [
    '<h1 class="fx-story-title">About Alignata</h1>',
    `<p class="fx-story-dek">${MISSION_TXT}</p>`,
    "<h2>What we make</h2>",
    "<p>Each tool does one job. One turns a Stripe payout file into an import for your books. Another turns Etsy orders into a LightBurn file.</p>",
    "<p>The tools run in your browser. There&#x27;s no account to make.</p>",
    "<p>The Daily Digest explains one AI technique at a time, in plain English.</p>",
    "<h2>Your files</h2>",
    "<p>When you drop a file into a tool, your browser does the work. The file isn&#x27;t uploaded to us.</p>",
    '<p>The site counts visits and taps without knowing who you are, and some tools send us counts like how many rows a file had. The <a href="/privacy">Privacy page</a> lists exactly what.</p>',
    '<p class="fx-built-by">Built by Osbel Morell.</p>',
    '<div class="fx-company-end"><a class="fx-pill" href="/apps">See the tools</a></div>',
  ];
  let at = -1;
  for (const f of order) { const i = html.indexOf(f); assert.ok(i > at, `about order: ${f}`); at = i; }
  assert.equal((html.match(/class="fx-pill"/g) || []).length, 1, "one black pill");
  assert.ok(!/Paramount|blog|team|values|\/terms|\/contact/i.test(html.replace(footerOf(html), "")), "no employer, no 'blog', no team or values; no Terms or Contact link in the body");
  assert.ok(existsSync("public/art/about-sticker.webp"));
  const b = readFileSync("public/art/about-sticker.webp");
  assert.equal(b.subarray(0, 4).toString(), "RIFF");
  assert.equal(b.subarray(8, 12).toString(), "WEBP");
  assert.deepEqual(imgsWithoutAlt(html), []);
});

test("/privacy (COPY.md §5 v4 FINAL): no art, H1, dek, 'Last updated' + SHIP_DATE, short version, H2 sections verbatim, no pill", async () => {
  const html = await companyHtml("/privacy");
  const mod = await import("../app/privacy/page.tsx");
  assert.equal(mod.metadata.title, "Privacy");
  assert.equal(mod.metadata.alternates.canonical, "/privacy");
  assert.ok(!html.includes("<img") && !html.includes("fx-story-hero"), "no art");
  assert.ok(!html.includes('class="fx-pill'), "no pill");
  const h2s = [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.deepEqual(h2s, ["The short version", "Your files", "What we count", "Vercel Web Analytics", "What&#x27;s saved in your browser", "Services we use", "What we don&#x27;t do", "Changes"]);
  for (const f of [
    '<h1 class="fx-story-title">Privacy</h1><p class="fx-story-dek">What Alignata collects, and what it doesn&#x27;t.</p><p class="fx-meta fx-story-meta">Last updated <time dateTime="2026-10-03">October 3, 2026</time></p>',
    "<li>Files you drop into a tool stay in your browser. We don&#x27;t upload them.</li><li>We count visits and taps without your name, email or IP address.</li><li>We don&#x27;t set cookies, show ads, or sell data.</li>",
    "For a file with 3 or more orders, it also sends a scrambled code made from the order numbers. We use it only to tell different files apart.</p>",
    "<h2>Services we use</h2><p>Vercel hosts the site, and Upstash stores our usage log. We don&#x27;t store your IP address. Vercel processes it briefly to serve and protect the site, and keeps its request logs for about a day. Our fonts are hosted on our own site.</p>",
    "<p>Entries are deleted automatically after about 180 days (about 120 days for Engrave Merge).</p>",
    "<p>Each entry has a random ID. A visitor ID stays in your browser until you clear this site&#x27;s data, and a session ID usually lasts only as long as the tab. Engrave Merge keeps its own random ID in your browser, like the visitor ID.</p>",
    "<h2>What we count</h2><p>We keep our own small log of how the site is used: which pages you visit, which tool you open and where on the site you tapped it, which articles you read, and which links you tap on the homepage. On Engrave Merge, we also count when the page opens, when you download or print a result, and whether you saw the price question and how you answered it.</p>",
    "<p>Engrave Merge also keeps a small note on this device: how many files you&#x27;ve dropped into it, which days it showed you the price question, and your answer if you gave one. That way it doesn&#x27;t keep asking.</p><h2>Services we use</h2>",
    "<h2>Changes</h2><p>If we change what we collect, for example when paid plans arrive, we&#x27;ll update this page first and change the date at the top.</p>",
  ]) assert.ok(html.includes(f), `privacy has: ${f.slice(0, 80)}`);
  assert.ok(!/LEGAL ENTITY NAME|Alignata is run by/.test(html), "Questions' entity line is cut (split release)");
  assert.ok(!/deleted when you close the tab|the same way\./.test(html), "old session-ID wording replaced (9:32 AM ET fix)");
  assert.ok(!html.includes("when you tap &quot;I&#x27;d pay&quot;"), "the old 'I'd pay' sentence is replaced (price card ships)");
  assert.ok(!/Paramount|blog/i.test(html));
});

test("company pages: only page_view (no new events or data attributes for tracking); tool bar hidden; Terms route not shipped", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  for (const r of ["about", "privacy"]) {
    const src = readFileSync(`app/${r}/page.tsx`, "utf8");
    assert.ok(!/sendSiteEvent|sendEvent|data-tool-slug|data-home-target/.test(src), `${r}: no new events`);
    assert.deepEqual(routeEvents(`/${r}`, mem()), [{ event: "page_view", props: { path: `/${r}` } }], `${r}: page_view only`);
  }
  const hub = readFileSync("components/HubChrome.tsx", "utf8");
  assert.ok(hub.includes("COMPANY_PATHS.includes(pathname)"), "the ← All tools bar is hidden on company pages");
  assert.equal(existsSync("app/terms"), false, "Terms is held: no /terms route in this release");
});

test("4-link release (CEO 9:43 AM ET): no /contact or /terms route, no link to either, no Privacy 'Questions', no mailto, sitemap = about + privacy", async () => {
  const { existsSync } = await import("node:fs");
  assert.equal(existsSync("app/contact"), false, "no /contact route");
  assert.equal(existsSync("app/terms"), false, "no /terms route");
  const { COMPANY_PATHS, FOOTER_LINKS } = await import("../content/company.ts");
  assert.deepEqual([...COMPANY_PATHS], ["/about", "/privacy"]);
  assert.deepEqual(FOOTER_LINKS.map((l) => l.label), ["Tools", "Daily Digest", "About", "Privacy"]);
  for (const route of ["/", "/about", "/privacy"]) {
    const html = await companyHtml(route);
    assert.ok(!/href="\/(contact|terms)/.test(html), `${route}: no link to /contact or /terms`);
    assert.ok(!/mailto:|\[CONTACT EMAIL\]|\bContact\b|\bTerms\b/.test(html), `${route}: no Contact/Terms/mailto`);
  }
  const privacy = await companyHtml("/privacy");
  assert.ok(!/Questions|Email \[/.test(privacy), "the whole Questions section is gone, heading included");
  const sitemap = (await import("../app/sitemap.ts")).default().map((e) => new URL(e.url).pathname);
  for (const p of ["/contact", "/terms"]) assert.ok(!sitemap.includes(p), `${p} not in the sitemap`);
  for (const p of ["/about", "/privacy"]) assert.ok(sitemap.includes(p), `${p} in the sitemap`);
});

test("[DATE] = SHIP_DATE: one constant in content/company.ts, rendered as the real date", async () => {
  const { readFileSync } = await import("node:fs");
  const { SHIP_DATE, shipDateLabel } = await import("../content/company.ts");
  assert.equal(SHIP_DATE, "2026-10-03");
  assert.equal(shipDateLabel(), "October 3, 2026");
  assert.equal(shipDateLabel("2026-11-09"), "November 9, 2026", "change SHIP_DATE and the page follows");
  for (const bad of ["Oct 3", "2026-13-01", "2026-10-00", ""]) assert.throws(() => shipDateLabel(bad), /YYYY-MM-DD/, bad);
  assert.equal((readFileSync("content/company.ts", "utf8").match(/SHIP_DATE = "/g) || []).length, 1, "defined once");
  assert.ok((await companyHtml("/privacy")).includes("Last updated <time dateTime=\"2026-10-03\">October 3, 2026</time>"));
});

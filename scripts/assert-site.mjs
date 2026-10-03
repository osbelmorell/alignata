// Unit tests for the first-party site tracker (validator, article n count, ids, skips, handler, baseline summary).
import assert from "node:assert/strict";
import test from "node:test";
import { SITE_EVENT_PROPS, validateSiteEvent } from "../lib/site/events.ts";
import {
  ARTICLES_KEY,
  DOGFOOD_KEY,
  articleSlug,
  dogfoodHref,
  dogfoodSession,
  getOrCreateId,
  homeClickTarget,
  noteArticle,
  randomId,
  routeEvents,
  shouldSkip,
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

test("/apps (v2 §5): 11 app rows in /apps order; row body → story, soft Open → tool; tracking attrs = shown position", async () => {
  const { getApps, toolsOrder, toolArt } = await import("../lib/apps.ts");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ToolsList } = await import("../components/appstore/ToolsList.tsx");
  const order = toolsOrder(getApps());
  assert.deepEqual(order.map((a) => a.name), [
    "Stripe→Books Cleaver", "License Risk Gate", "Agent Bundle Tag", "Agent Eval Go/No-Go", "Deploy Decision Card", "Engrave Merge",
    "Enterprise Scorecard", "Env Diff Snapshot", "Hobby Deploy Burn Digest", "LLM Feature-Cost Tag", "What-Changed Card",
  ]);
  assert.equal(order.find((a) => a.id === "stripe-cleaver").blurb, "Turn a Stripe payout file into a QuickBooks or Xero import.", "locked Cleaver line");
  for (const a of order) assert.ok(toolArt(a.id).icon, `${a.id} has an icon`);
  const html = renderToStaticMarkup(createElement(ToolsList, { apps: order }));
  const rows = html.split('<li class="fx-arow"').slice(1);
  assert.equal(rows.length, 11, "11 rows");
  order.forEach((a, i) => {
    const r = rows[i];
    assert.ok(r.startsWith(` data-slug="${a.id}" data-pos="${i + 1}"`), `row ${i + 1} is ${a.id}`);
    const t = toolArt(a.id);
    assert.ok(r.includes(`<img class="fx-icon" src="${t.icon}" alt="${t.iconAlt.replace(/'/g, "&#x27;")}"`), `${a.id} icon + FINAL alt`);
    const open = [...r.matchAll(/<a class="fx-open" href="([^"]+)" data-tool-slug="([^"]+)" data-tool-pos="(\d+)" aria-label="Open ([^"]+)">Open<\/a>/g)];
    assert.equal(open.length, 1, `${a.id}: one soft Open`);
    assert.deepEqual([open[0][1], open[0][2], +open[0][3]], [a.url, a.id, i + 1], `${a.id}: Open → tool, tracked at its position`);
    if (a.id === "deploy-decision-card") {
      assert.ok(r.includes(`<a class="fx-stretch" href="${a.url}" data-tool-slug="${a.id}" data-tool-pos="${i + 1}">`), "Deploy Decision: row body → the tool (no story)");
    } else {
      assert.ok(r.includes(`<a class="fx-stretch" href="/apps/${a.id}">`), `${a.id}: row body → /apps/${a.id} (no tool_open on a story tap)`);
    }
    assert.ok(SLUG_RE_OK(a.id), `${a.id} passes the tool_open slug check`);
  });
  assert.equal((html.match(/>Open<\/a>/g) || []).length, 11, "every row has a visible Open");
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
  ["env-diff-snapshot", "A magnifying glass over two paper sheets whose lines don't match up.", "A magnifying glass."],
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
    assert.match(html, new RegExp(`<a class="fx-open" href="/${slug}" data-tool-slug="${slug}" data-tool-pos="${pos}" data-home-target="tool:${slug}" aria-label="Open [^"]+">Open</a>`), `${slug}: soft Open → tool`);
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

test("tool story (v2 §4): 10 static stories (no Deploy Decision), hero + H1 + black Open row, About body, end row, sticky bar", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { getApps, toolsOrder, toolArt, TOOL_STORY } = await import("../lib/apps.ts");
  const mod = await import("../app/apps/[slug]/page.tsx");
  const slugs = mod.generateStaticParams().map((p) => p.slug);
  assert.equal(slugs.length, 10);
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
  assert.equal(files.length, 24 + 10 + 11, "24 Digest heroes + 10 tool heroes + 11 icons");
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

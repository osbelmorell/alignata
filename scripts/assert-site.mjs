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

test("/apps (v1.4): 11 tools, Cleaver 01 and License Gate 02 with custom art, the rest A–Z; tracking attrs = shown position", async () => {
  const { getApps, toolsOrder, toolArt } = await import("../lib/apps.ts");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ToolsPage } = await import("../components/fantasy/ToolsPage.tsx");
  const order = toolsOrder(getApps());
  assert.deepEqual(order.map((a) => a.name), [
    "Stripe→Books Cleaver", "License Risk Gate", "Agent Bundle Tag", "Agent Eval Go/No-Go", "Deploy Decision Card", "Engrave Merge",
    "Enterprise Scorecard", "Env Diff Snapshot", "Hobby Deploy Burn Digest", "LLM Feature-Cost Tag", "What-Changed Card",
  ]);
  assert.equal(order.find((a) => a.id === "stripe-cleaver").blurb, "Turn a Stripe payout file into a QuickBooks or Xero import.", "locked Cleaver line");
  assert.deepEqual(order.map((a) => toolArt(a.id).file), ["stripe-cleaver", "license-gate", ...Array(9).fill("fallback-tile")]);
  const html = renderToStaticMarkup(createElement(ToolsPage, { apps: order }));
  const attrs = [...html.matchAll(/<a class="(fx-stretch|fx-pill)" href="([^"]+)" data-tool-slug="([^"]+)" data-tool-pos="(\d+)"/g)].map((m) => [m[1], m[3], +m[4]]);
  assert.equal(attrs.length, 22, "card link + Open on every card");
  order.forEach((a, i) => {
    assert.deepEqual(attrs[2 * i], ["fx-stretch", a.id, i + 1]);
    assert.deepEqual(attrs[2 * i + 1], ["fx-pill", a.id, i + 1]);
    assert.ok(SLUG_RE_OK(a.id), `${a.id} passes the tool_open slug check`);
  });
  assert.equal((html.match(/fx-dot/g) || []).length, 1, "lime once: the dot before 01 /");
  assert.equal((html.match(/>Open<\/a>/g) || []).length, 11, "every card has a visible Open");
  for (let i = 1; i <= 11; i++) assert.ok(html.includes(`${String(i).padStart(2, "0")} /`), `number ${i}`);
});
const SLUG_RE_OK = (s) => validateSiteEvent({ v: 1, event: "tool_open", sid: SID, vid: VID, dogfood: false, props: { slug: s, position: 1 } }).ok;

test("Daily Digest (v1.4): tags, real read time, hero art + alt, verbatim pull quotes, Next article chain", async () => {
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
    if ("src" in hero) {
      for (const f of [hero.src, hero.cardSrc]) assert.ok(existsSync(`public${f}`), `${p.slug}: ${f}`);
      assert.equal(hero.src, `/art/digest/${p.slug}.webp`);
      assert.equal(hero.cardSrc, `/art/digest/${p.slug}-card.webp`);
      assert.deepEqual([meta.heroImage(p).width, meta.heroImage(p).height, meta.cardImage(p).width, meta.cardImage(p).height], [1600, 900, 1600, 900]);
    } else {
      for (const size of [640, 1280]) assert.ok(existsSync(`public/art/${hero.image}-${size}.webp`), `${p.slug}: ${hero.image}-${size}.webp`);
    }
    assert.match(hero.alt, /^[A-Z].{10,200}\.$/, `${p.slug}: alt is one plain sentence`);
    if (p.pullQuote) {
      const paras = meta.bodyBlocks(p).filter((b) => b.kind === "paragraph").map((b) => toPlainText(b.text));
      assert.ok(paras.some((t) => t.includes(p.pullQuote.text)), `${p.slug}: pull quote is verbatim from the body`);
      if (p.pullQuote.cite) assert.ok(paras.includes(p.pullQuote.cite), `${p.slug}: cite is the article's own byline`);
    }
  }
  assert.equal(meta.postHero(posts.find((p) => p.slug === "the-ai-safety-paradox")).image, "the-ai-safety-paradox");
  assert.equal(posts.filter((p) => p.hero && "src" in p.hero).length, 23, "Brand Creator art for the 23 other articles (Oct 2)");
  assert.equal(meta.shortDate("2026-10-02"), "Oct 2");
  assert.equal(meta.shortDate("2026-09-16"), "Sep 16");
  // Next article: the next older one, oldest wraps to newest; following it visits every article once.
  const list = getPostsNewestFirst();
  list.forEach((p, i) => assert.equal(meta.nextPost(p.slug).slug, list[(i + 1) % list.length].slug));
  const seen = new Set();
  for (let s = list[0].slug; !seen.has(s); s = meta.nextPost(s).slug) seen.add(s);
  assert.equal(seen.size, list.length);
});

test("Daily Digest pages render: index cards (feature first, one lime dot, no Open), article head order, 01. list, Next card", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { getPostsNewestFirst, getPost } = await import("../content/posts.ts");
  const { PostCard } = await import("../components/fantasy/PostCard.tsx");
  const { ArticleBody } = await import("../components/daily-digest/ArticleBody.tsx");
  const list = getPostsNewestFirst();
  const cards = list.map((p, i) => renderToStaticMarkup(createElement(PostCard, { post: p, feature: i === 0, dot: i === 0 }))).join("");
  assert.equal((cards.match(/data-post-card=/g) || []).length, 24);
  assert.equal((cards.match(/fx-feature/g) || []).length, 1);
  assert.equal((cards.match(/fx-dot/g) || []).length, 1);
  assert.ok(!/>Open</.test(cards), "no Open pill on the digest");
  assert.equal((cards.match(/<a class="fx-stretch" href="\/daily-digest\/[a-z0-9-]+">/g) || []).length, 24, "title is the link");
  const tech = getPost("break-loops-when-progress-stalls");
  const body = renderToStaticMarkup(createElement(ArticleBody, { paragraphs: tech.paragraphs }));
  assert.match(body, /<h2>Try it<\/h2><ol start="1" style="counter-reset:fx-ol 0"><li>After each tool step/);
  const essay = getPost("the-ai-safety-paradox");
  const eb = renderToStaticMarkup(createElement(ArticleBody, { paragraphs: essay.paragraphs, pullQuote: essay.pullQuote }));
  assert.equal((eb.match(/data-pullquote/g) || []).length, 1);
  assert.match(eb, /design the locks\. And not just design them[^<]*<\/p><figure class="fx-pullquote" data-pullquote="true" aria-hidden="true">/);
  assert.match(eb, /<p class="fx-byline">— Osbel Morell<\/p><\/div>$/);
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

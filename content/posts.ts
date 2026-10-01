/**
 * Daily Digest articles. Body convention (rendered by components/daily-digest/ArticleBody):
 * - Section title: a paragraph starting with "## " → <h2>; "### " → <h3>.
 * - Bulleted list: consecutive paragraphs starting with "- " (or "* ").
 * - Numbered list: consecutive paragraphs starting with "1. " (or "1) ").
 * - Anything else is a normal paragraph. One string may also hold several lines split by "\n".
 * Example:
 *   paragraphs: ["## Why it matters", "Short intro.", "- first point", "- second point", "1. Do this", "2. Then this"]
 * Optional: `sections: [{ heading: "Why it matters", body: ["Short intro.", "- first point"] }]`
 * renders after `paragraphs`, each heading as <h2>.
 */
export type Post = {
  slug: string;
  title: string;
  dek: string;
  date: string;
  sourceNote?: string;
  paragraphs: string[];
  sections?: { heading: string; body: string[] }[];
};

export const posts: Post[] = [
  {
    slug: "keep-hard-rules-sticky",
    title: "Keep hard rules sticky",
    dek: "Soft reminders fade in long chats. Re-inject the non-negotiables every turn.",
    date: "2026-09-28",
    sourceNote: "based on hub digest 2026-09-24 technique test",
    paragraphs: [
      "Long agent chats have a boring failure mode. The hard rules were clear up front — don't send money, don't force-push, keep Auth off — then twenty turns later the model proposes exactly that, like the rule never existed.",
      "It isn't malice. Context fills up with task detail, tool noise, and soft advice. The one-time \"don't do X\" line gets buried. Soft reminders fade. Sticky ones don't.",
      "Put a short block of non-negotiables into each turn's context. Not once at session start. Every turn, before the next action. Keep soft advice out of that block so it stays short and sharp — red lines only.",
      "How we apply it: list the hard rules in one compact block, re-inject that same block every turn, and leave the coaching elsewhere. The goal is simple — when a dangerous action shows up late in the chat, the guardrail is still sitting in front of the model.",
      "We tested this offline on the box as a structural sim (no live model). Twelve turns. Eight proposals that should have been blocked. Rules stated once blocked four of eight and slipped four times. Sticky reinjection blocked all eight, with zero slips, and still let innocent actions through.",
      "Smallest useful version: a sticky list you actually re-inject, not a one-time preamble you hope the model remembers.",
      "This does not replace tool-level authorization. It only keeps the policy text present when a dangerous action shows up. Offline numbers are not production rates — retest on a live agent before you treat the block rates as real.",
    ],
  },
  {
    slug: "test-search-before-saying-none",
    title: "Test search before saying none",
    dek: "A broken search tool can return the same clean empty list as a real \"nothing found.\" One lookup you know should hit tells them apart.",
    date: "2026-09-29",
    paragraphs: [
      "The problem",
      "An agent searches for open incidents, gets an empty list back, and tells you there are none. Usually that's true. Sometimes the token expired, a bad reindex left the index empty, or one partition is down. Plenty of connectors return a clean, successful-looking empty list in those cases instead of an error. The agent can't tell \"nothing matches\" from \"nothing works,\" so a broken tool turns into a confident answer. That's worse than an error, because nobody goes back to check.",
      "The technique",
      "Keep one record in each data source that you know is there. Call it a canary. When a search comes back empty, look up the canary before trusting the result. If the canary shows up, the tool works and \"nothing found\" stands. If the canary is missing too, don't claim absence. Say the tool looks broken and you can't confirm either way.",
      "If the data is split across shards or partitions, keep one canary in each. A single canary only proves its own shard is up.",
      "What we saw",
      "We ran this offline as a scripted simulation, with no live model: 120 search calls against a mock index split into two shards. The tool was healthy on 90 calls, fully silent on 15, and had one shard down on 15. 63 of the queries had a real match.",
      "- Trusting empty results gave 11 false \"none exist\" answers.",
      "- One canary cut that to 5, for 68 extra lookups. All 15 \"tool looks broken\" flags came during real outages. The 5 misses were all partial outages where the down shard wasn't the canary's shard.",
      "- One canary per shard got it to 0, for 136 extra lookups. All 27 flags came during real outages.",
      "So the check works, but only as far as the canary reaches. A partial outage beats a single canary.",
      "Limits",
      "These are simulation numbers, not production rates. We picked the outage mix and the index, so the counts show how the check behaves, not how often your tools fail. The extra lookup adds latency on every empty result, and the per-shard version doubles that here. Canaries also go stale if someone deletes the record. A real test needs a live connector with injected failures (expired auth, an empty index, one partition down), a measure of the added latency, and a check that the canary records stay put.",
      "Try it",
      "1. For each search tool your agent uses, pick one stable record per source or partition that should always be there.",
      "2. Wrap the tool so an empty result triggers a canary lookup.",
      "3. If any canary is missing, return \"search looks unavailable, can't confirm no results\" and log it.",
      "4. If every canary is found, pass the empty result through as a real \"none found.\"",
      "5. Alert on canary misses and treat them as incidents, not answers.",
    ],
  },
  {
    slug: "dont-follow-orders-in-tool-text",
    title: "Don't follow orders in tool text",
    dek: "Tool replies are data, not instructions. Check them for commands before the agent plans its next step.",
    date: "2026-10-01",
    paragraphs: [
      "## The problem",
      "An agent reads an email, a web page, or a ticket through a tool and treats that text as if you wrote it. Somewhere in the body is a line like \"ignore your previous rules,\" \"forward this to everyone,\" or \"delete the repo.\" The model goes along with it because the words arrived through a successful tool call. That's how one poisoned message turns into a mass email, a wiped repo, or a message that copies itself to the next inbox, and nobody asked for any of it.",
      "## The technique",
      "Treat everything a tool returns as data, never as a new source of instructions. Before the agent plans its next tool call, scan the returned text for instruction-shaped lines: ignore previous rules, forward to all, run this command, delete the database, pass this message on, treat this as your system prompt. On a hit, strip or wrap those lines, mark the result untrusted, and refuse any action that only that text asked for. The user's request still drives the next step. The tool text doesn't.",
      "## What we saw",
      "We ran this offline as a scripted simulation, with no live model: 12 tool replies, 8 with planted instructions and 4 ordinary ones.",
      "- A naive setup that acts on whatever the tool text suggests carried out all 8 harmful follow-ups, including forwarding to everyone, deleting a repo, sending data out through a web page, and moving money.",
      "- With the check in place, all 8 planted replies were flagged and 0 harmful follow-ups ran. All 4 ordinary replies (an email summary, a ticket, a code review, a status message) went through with no false blocks.",
      "So in this test, the check closed the \"the tool said so\" path without getting in the way of normal email and ticket text.",
      "## Limits",
      "These are simulation numbers, not production rates. The same hand-written pattern list shaped both the check and the test cases, so a clean sweep here shows the mechanism works, not how well it holds up against a real attacker. A reworded or encoded instruction can slip past until you widen the list. The check also doesn't replace tool-level permissions or hard rules on irreversible actions. It only stops tool text from acting as a command channel. A live retest needs real agent transcripts with injected email and web content, plus a measure of how often stripping removes wording the user actually needed.",
      "## Try it",
      "1. Write down the instructions you'll never act on from tool text, such as forward to all, ignore prior rules, delete or wipe, run this command, pass this on, and new system prompt.",
      "2. Scan every tool reply before the next planning step.",
      "3. On a hit, mark the reply untrusted, strip or wrap the matching lines, and drop any tool call that came only from that text.",
      "4. Log each hit as a security signal instead of skipping it silently.",
      "5. Keep hard rules and checks before irreversible actions as separate layers, because this check won't catch everything.",
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getPostsNewestFirst(): Post[] {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

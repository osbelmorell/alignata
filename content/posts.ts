export type Post = {
  slug: string;
  title: string;
  dek: string;
  date: string;
  sourceNote?: string;
  paragraphs: string[];
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
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getPostsNewestFirst(): Post[] {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

# AI Digest posts

Drop one JSON file per weekday digest:

`content/llm-digest/posts/YYYY-MM-DD.json`

## Locked house style (2026-09-25)

- **Editorial first.** Technique titles and body in plain English (WHAT / WHY). Never use snake_case ids as the primary card or headline text.
- **Title = plain verb-first English (~3–7 words), no engineer jargon.** Lead with a concrete action a human would say out loud.
  - Good: `Re-send the hard rules every turn`
  - Good: `Refuse answers that don't match tool results`
  - Bad: `Sticky constraint reinjection`
  - Bad: `Execution-alignment gate`
- **Outcome = required one-line benefit under the title** (`techniques[].outcome`, ~≤12 words). Says what the reader gains; no invented numbers.
  - Good: `Keeps agents from forgetting must-follow rules in long chats.`
  - Good: `Stops invented "CI green" or fake search hits from shipping as done.`
  - Bad: `Improves alignment by 37% in production.`
  - Bad: omit `outcome` on a ranked technique
- **Evidence second.** Metrics and “how it was tested” live in `techniques[].howTested` (UI accordion / More). Do not invent numbers.
- **List teasers.** One plain sentence per technique in `techniques[].teaser`.
- **Rank.** Each technique has `rank` 1|2|3 (1 = try first that day). UI sorts ascending and shows a numeric badge; rank 1 also shows “Try first”. Prefer safety / irreversible-action guards as #1 when tied. Backfill ranks on older posts too.
- **Result (optional).** `result`: `WORKS` | `MIXED` | `FAILS` is test outcome — separate from rank and from the editorial `outcome` benefit line. Show all when present; never replace one with another.
- **No public publish note** in `bodyMarkdown`. Ops how-to stays in this README only.
- **bodyMarkdown `## Techniques` headings** must match the plain titles.

## Schema

```json
{
  "slug": "2026-09-24",
  "title": "AI Digest — Thu Sep 24, 2026",
  "publishedAt": "2026-09-24T12:00:00-04:00",
  "summary": "One-line board blurb in plain English",
  "tags": ["news", "techniques"],
  "sources": [{ "label": "…", "url": "https://…" }],
  "links": [{ "label": "…", "url": "/llm-digest/2026-09-24" }],
  "techniques": [
    {
      "id": "internal_id_ok_here",
      "rank": 1,
      "result": "WORKS",
      "title": "Re-send the hard rules every turn",
      "outcome": "Keeps agents from forgetting must-follow rules in long chats.",
      "teaser": "One sentence for the feed card.",
      "whatWhy": "2–4 sentences: problem + why the pattern helps.",
      "howTested": "Offline/live box test description + real metrics only."
    }
  ],
  "bodyMarkdown": "# …\n\n## Techniques\n\n### Re-send the hard rules every turn\n\n…"
}
```

Feed: `/llm-digest` · Post: `/llm-digest/<slug>`

Publish loop (LLM desk): write file → `node -e` JSON.parse every file in `posts/` → commit to `main` (author `osbelmorell@yahoo.es`) → wait for post URL 200 → hand CEO the live URL.

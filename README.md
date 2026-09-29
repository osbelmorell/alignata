# Alignata

Build tools for busy humans.

- `/` — brand home
- `/apps` — Clay Board tool grid (Build hub)
- `/daily-digest` — Daily Digest techniques notes (Keep hard rules sticky); RSS at `/daily-digest/rss.xml`; `/blog` and `/blog/*` 301 here
- Tool routes: `/license-gate`, `/stripe-cleaver`, `/llm-digest`, `/scorecard`, …

Auth OFF. Clay Board house style.

## Daily Digest article format

Articles live in `content/posts.ts` (`paragraphs: string[]`), rendered by `components/daily-digest/ArticleBody.tsx`.

- Section title: start a paragraph with `## ` (renders `<h2>`); `### ` renders `<h3>`.
- Bulleted list: consecutive paragraphs starting with `- ` (or `* `).
- Numbered list: consecutive paragraphs starting with `1. `, `2. ` … (or `1) `).
- Anything else is a normal paragraph. A single string may also contain several lines separated by `\n`.
- Legacy fallback: a bare paragraph exactly equal to The problem / The technique / What we saw / Limits / Try it also renders as `<h2>` (older articles only; not required).
- Optional structured body: `sections: [{ heading, body: string[] }]` renders after `paragraphs`, each heading as `<h2>`.

Example:

```ts
paragraphs: [
  "## Why it matters",
  "Short intro paragraph.",
  "- first point",
  "- second point",
  "1. Do this",
  "2. Then this",
],
```

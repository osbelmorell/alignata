import type { CostEvent } from "./types";

/** Sample week of tagged LLM spend — chat under 40%, research over 40% to demo alert */
export const SAMPLE_EVENTS: CostEvent[] = [
  { ts: "2026-09-08", feature: "chat", costUsd: 12.4, tokens: 820000, model: "gpt-4.1-mini" },
  { ts: "2026-09-08", feature: "research", costUsd: 48.2, tokens: 3100000, model: "gpt-4.1" },
  { ts: "2026-09-09", feature: "chat", costUsd: 11.1, tokens: 760000, model: "gpt-4.1-mini" },
  { ts: "2026-09-09", feature: "research", costUsd: 52.0, tokens: 3400000, model: "gpt-4.1" },
  { ts: "2026-09-10", feature: "chat", costUsd: 13.0, tokens: 900000, model: "gpt-4.1-mini" },
  { ts: "2026-09-10", feature: "summarize", costUsd: 6.5, tokens: 410000, model: "gpt-4.1-mini" },
  { ts: "2026-09-10", feature: "research", costUsd: 61.3, tokens: 3900000, model: "gpt-4.1" },
  { ts: "2026-09-11", feature: "chat", costUsd: 10.2, tokens: 700000, model: "gpt-4.1-mini" },
  { ts: "2026-09-11", feature: "research", costUsd: 55.8, tokens: 3600000, model: "gpt-4.1" },
  { ts: "2026-09-12", feature: "chat", costUsd: 14.7, tokens: 980000, model: "gpt-4.1-mini" },
  { ts: "2026-09-12", feature: "summarize", costUsd: 7.1, tokens: 450000, model: "gpt-4.1-mini" },
  { ts: "2026-09-12", feature: "research", costUsd: 70.4, tokens: 4500000, model: "gpt-4.1" },
  { ts: "2026-09-13", feature: "chat", costUsd: 12.9, tokens: 850000, model: "gpt-4.1-mini" },
  { ts: "2026-09-13", feature: "research", costUsd: 66.0, tokens: 4200000, model: "gpt-4.1" },
  { ts: "2026-09-14", feature: "chat", costUsd: 11.5, tokens: 780000, model: "gpt-4.1-mini" },
  { ts: "2026-09-14", feature: "research", costUsd: 58.9, tokens: 3700000, model: "gpt-4.1" },
];

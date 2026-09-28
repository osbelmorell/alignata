import type { Bundle } from "./types";

/** Two sample bundles so History/Diff demos on first load */
export const SAMPLE_BUNDLES: Bundle[] = [
  {
    id: "sample-bundle-001",
    name: "Support triage v1",
    prompt_ref: "prompts/support-triage@v1",
    model_id: "gpt-4.1-mini",
    tools_note: "search_kb, escalate_ticket",
    env: "staging",
    marked_live: false,
    created_at: "2026-09-16T14:00:00.000Z",
  },
  {
    id: "sample-bundle-002",
    name: "Support triage v2",
    prompt_ref: "prompts/support-triage@v2",
    model_id: "gpt-4.1",
    tools_note: "search_kb, escalate_ticket, draft_reply",
    env: "prod",
    marked_live: true,
    created_at: "2026-09-18T10:30:00.000Z",
  },
];

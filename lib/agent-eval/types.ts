export type ItemStatus = "pass" | "fail" | "na" | "unset";

export type SectionId =
  | "component"
  | "trajectory"
  | "outcome"
  | "adversarial";

export type ChecklistItem = {
  id: string;
  label: string;
  /** When true, a fail flips overall verdict to FAIL / NO-GO. */
  required: boolean;
  status: ItemStatus;
  notes: string;
};

export type EvalSection = {
  id: SectionId;
  title: string;
  description: string;
  items: ChecklistItem[];
};

export type Verdict = "PASS" | "FAIL" | "INCOMPLETE";

export type AgentEval = {
  id: string;
  /** Agent / eval name shown in header */
  name: string;
  /** Eval date (YYYY-MM-DD or ISO) */
  date: string;
  sections: EvalSection[];
  verdict: Verdict;
  /** Human-readable reason for the badge */
  reasonSummary: string;
  updatedAt: string;
};

export type HistoryStore = {
  evals: AgentEval[];
  lastEval: AgentEval | null;
  updatedAt: string;
};

export const SECTION_META: Record<
  SectionId,
  { title: string; description: string; accent: string }
> = {
  component: {
    title: "Component",
    description: "Does the agent/unit work in isolation?",
    accent: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  },
  trajectory: {
    title: "Trajectory",
    description: "Does the multi-step path look sane?",
    accent: "border-violet-500/40 bg-violet-500/10 text-violet-200",
  },
  outcome: {
    title: "Outcome",
    description: "Did it achieve the goal / metric?",
    accent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
  adversarial: {
    title: "Adversarial",
    description: "Did it fail unsafe / jailbreak / edge cases?",
    accent: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  },
};

/** Visible go/no-go rule shown in the UI. */
export const VERDICT_RULE =
  "GO (PASS) only if every required item is Pass or N/A. NO-GO (FAIL) if any required item is Fail. Incomplete while any required item is still unset.";

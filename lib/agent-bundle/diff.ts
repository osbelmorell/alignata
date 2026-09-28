import type { Bundle, FieldDiff } from "./types";

const LABELS: Record<string, string> = {
  name: "Name",
  prompt_ref: "Prompt",
  model_id: "Model",
  tools_note: "Tools",
  env: "Env",
  marked_live: "Marked live",
  created_at: "Created",
};

function fmt(v: unknown): string {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (v == null) return "";
  return String(v);
}

export function chronological(bundles: Bundle[]): Bundle[] {
  return [...bundles].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function diffBundles(before: Bundle, after: Bundle): FieldDiff[] {
  const keys: (keyof Bundle)[] = [
    "name",
    "prompt_ref",
    "model_id",
    "tools_note",
    "env",
    "marked_live",
    "created_at",
  ];
  return keys.map((key) => {
    const b = fmt(before[key]);
    const a = fmt(after[key]);
    return {
      key: key as FieldDiff["key"],
      label: LABELS[key] ?? key,
      before: b,
      after: a,
      changed: b !== a,
    };
  });
}

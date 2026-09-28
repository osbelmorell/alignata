import type { Bundle, FieldDiff } from "./types";

const FIELDS: { key: FieldDiff["key"]; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "prompt_ref", label: "Prompt" },
  { key: "model_id", label: "Model" },
  { key: "tools_note", label: "Tools" },
  { key: "env", label: "Env" },
  { key: "marked_live", label: "Marked live" },
  { key: "created_at", label: "Created at" },
];

function stringify(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "";
  return String(value);
}

export function diffBundles(before: Bundle, after: Bundle): FieldDiff[] {
  return FIELDS.map(({ key, label }) => {
    const b = stringify(before[key]);
    const a = stringify(after[key]);
    return {
      key,
      label,
      before: b,
      after: a,
      changed: b !== a,
    };
  });
}

export function chronological(bundles: Bundle[]): Bundle[] {
  return [...bundles].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

"use client";

import { Field, primaryBtn, cardClass } from "@/components/agent-bundle/BundleDeskShared";

export function BundleDeskRegister({
  form,
  errors,
  setField,
  onSave,
}: {
  form: {
    name: string;
    prompt_ref: string;
    model_id: string;
    tools_note: string;
    env: string;
    marked_live: boolean;
  };
  errors: Record<string, string>;
  setField: <K extends string>(key: K, value: unknown) => void;
  onSave: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSave} className={`space-y-4 p-4 sm:p-5 ${cardClass}`}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          required
          error={errors.name}
          value={form.name}
          onChange={(v) => setField("name", v)}
          placeholder="Support triage v3"
        />
        <Field
          label="Prompt"
          required
          error={errors.prompt_ref}
          value={form.prompt_ref}
          onChange={(v) => setField("prompt_ref", v)}
          placeholder="prompts/support-triage@v3"
        />
        <Field
          label="Model"
          required
          error={errors.model_id}
          value={form.model_id}
          onChange={(v) => setField("model_id", v)}
          placeholder="gpt-4.1"
        />
        <Field
          label="Env"
          value={form.env}
          onChange={(v) => setField("env", v)}
          placeholder="staging | prod"
        />
      </div>
      <Field
        label="Tools"
        value={form.tools_note}
        onChange={(v) => setField("tools_note", v)}
        placeholder="search_kb, draft_reply"
        multiline
      />
      <label className="flex items-center gap-2 text-sm text-[var(--cb-ink)]">
        <input
          type="checkbox"
          checked={form.marked_live}
          onChange={(e) => setField("marked_live", e.target.checked)}
          className="size-4 rounded border-[var(--cb-line)] accent-[var(--cb-lime)]"
        />
        Mark as live
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" className={primaryBtn}>
          Save bundle
        </button>
      </div>
    </form>
  );
}

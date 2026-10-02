"use client";

import { AboutPanel } from "@/components/agent-bundle/AboutPanel";
import { BundleDeskHistory } from "@/components/agent-bundle/BundleDeskHistory";
import { BundleDeskRegister } from "@/components/agent-bundle/BundleDeskRegister";
import { secondaryBtn, quietBtn } from "@/components/agent-bundle/BundleDeskShared";

import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { chronological, diffBundles } from "@/lib/agent-bundle/diff";
import {
  appendBundle,
  clearStore,
  loadStore,
  resetToSample,
} from "@/lib/agent-bundle/storage";
import type { Bundle } from "@/lib/agent-bundle/types";

type Tab = "register" | "history";

const emptyForm = {
  name: "",
  prompt_ref: "",
  model_id: "",
  tools_note: "",
  env: "staging",
  marked_live: false,
};

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `bundle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function BundleDesk() {
  const [tab, setTab] = useState<Tab>("register");
  // Read localStorage once on the client; the !hydrated placeholder hides it until mounted.
  const [initialStore] = useState(loadStore);
  const [bundles, setBundles] = useState<Bundle[]>(initialStore.bundles);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState(
    initialStore.bundles.length
      ? `Loaded ${initialStore.bundles.length} bundle(s) from localStorage.`
      : "No bundles yet — register one or load sample.",
  );
  const hydrated = useHydrated();
  const [selectedIds, setSelectedIds] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  const ordered = useMemo(() => chronological(bundles), [bundles]);

  const diffPair = useMemo(() => {
    if (ordered.length < 2) return null;
    const [a, b] = selectedIds;
    if (a && b && a !== b) {
      const left = ordered.find((x) => x.id === a);
      const right = ordered.find((x) => x.id === b);
      if (left && right) {
        const [before, after] =
          new Date(left.created_at).getTime() <=
          new Date(right.created_at).getTime()
            ? [left, right]
            : [right, left];
        return { before, after, fields: diffBundles(before, after) };
      }
    }
    const before = ordered[ordered.length - 2];
    const after = ordered[ordered.length - 1];
    return { before, after, fields: diffBundles(before, after) };
  }, [ordered, selectedIds]);

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value } as typeof emptyForm));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.prompt_ref.trim()) next.prompt_ref = "Required";
    if (!form.model_id.trim()) next.model_id = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      setStatus("Fix required fields before saving.");
      return;
    }
    const bundle: Bundle = {
      id: newId(),
      name: form.name.trim(),
      prompt_ref: form.prompt_ref.trim(),
      model_id: form.model_id.trim(),
      tools_note: form.tools_note.trim(),
      env: form.env.trim() || "staging",
      marked_live: form.marked_live,
      created_at: new Date().toISOString(),
    };
    const store = appendBundle(bundle);
    setBundles(store.bundles);
    setForm(emptyForm);
    setStatus(`Saved "${bundle.name}".`);
    setTab("history");
  }

  function toggleSelect(id: string) {
    setSelectedIds(([a, b]) => {
      if (a === id) return [null, b];
      if (b === id) return [a, null];
      if (!a) return [id, b];
      if (!b) return [a, id];
      return [b, id];
    });
  }

  async function onCopyBundle(b: Bundle) {
    const ok = await copyText(JSON.stringify(b, null, 2));
    setStatus(ok ? `Copied JSON for "${b.name}".` : "Clipboard copy failed.");
  }

  async function onCopyDiff() {
    if (!diffPair) return;
    const payload = {
      before: diffPair.before,
      after: diffPair.after,
      changes: diffPair.fields.filter((f) => f.changed),
    };
    const ok = await copyText(JSON.stringify(payload, null, 2));
    setStatus(ok ? "Copied diff JSON." : "Clipboard copy failed.");
  }

  function onClear() {
    clearStore();
    setBundles([]);
    setSelectedIds([null, null]);
    setStatus("Cleared localStorage history.");
  }

  function onResetSample() {
    const store = resetToSample();
    setBundles(store.bundles);
    setSelectedIds([null, null]);
    setStatus("Reset to 2 sample bundles.");
  }

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-4xl min-w-0 px-3 py-8 text-[var(--cb-ink-muted)] sm:px-4 sm:py-10">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 px-3 py-8 text-[var(--cb-ink)] sm:px-4 sm:py-10">
      <header className="mb-8 min-w-0 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cb-ink-muted)]">
          Build bet · Hobby · localStorage only
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--cb-ink)]">
          Agent Bundle Tag
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--cb-ink-muted)]">
          Record what&apos;s live for an agent and see what changed.
        </p>
      </header>

      <AboutPanel />

      <nav className="mb-6 flex min-w-0 flex-col gap-2 border-b border-[var(--cb-line)] pb-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 flex-wrap gap-2">
          {(
            [
              ["register", "Register Bundle"],
              ["history", "History / Diff"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-[var(--cb-radius-pill)] px-3 py-1.5 text-sm font-medium transition ${
                tab === id
                  ? "bg-[var(--cb-ink)] text-white"
                  : "border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] text-[var(--cb-ink-muted)] hover:bg-[var(--cb-line)] hover:text-[var(--cb-ink)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 sm:ml-auto">
          <button type="button" onClick={onResetSample} className={secondaryBtn}>
            Load sample
          </button>
          <button type="button" onClick={onClear} className={quietBtn}>
            Clear
          </button>
        </div>
      </nav>

      {status ? (
        <p className="mb-4 min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-3 py-2 text-xs text-[var(--cb-ink-muted)] shadow-[var(--cb-shadow)]">
          {status}
        </p>
      ) : null}

      {tab === "register" ? (
        <BundleDeskRegister
          form={form}
          errors={errors}
          setField={setField}
          onSave={onSave}
        />
      ) : (
        <BundleDeskHistory
          ordered={ordered}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          onCopyBundle={onCopyBundle}
          diffPair={diffPair}
          onCopyDiff={onCopyDiff}
        />
      )}
    </div>
  );
}

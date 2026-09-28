"use client";

export const primaryBtn =
  "rounded-[var(--cb-radius-pill)] bg-[var(--cb-ink)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90";

export const secondaryBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-2.5 py-1 text-xs font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-line)]";

export const quietBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-2.5 py-1 text-xs font-medium text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)] hover:text-[var(--cb-ink)]";

export const cardClass =
  "min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:rounded-[var(--cb-radius-squircle)]";

export const inputClass =
  "w-full max-w-full rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={multiline ? "min-w-0 sm:col-span-2" : "min-w-0"}>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-[var(--cb-ink-muted)]"
      >
        {label}
        {required ? (
          <span className="text-[var(--cb-danger)]"> *</span>
        ) : null}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
      {error ? (
        <p className="mt-1 text-xs text-[var(--cb-danger)]">{error}</p>
      ) : null}
    </div>
  );
}

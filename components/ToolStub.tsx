import Link from "next/link";

/** Temporary shell for a hub route that is not fully migrated yet. */
export function ToolStub({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col justify-center gap-4 px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--cb-ink-muted)]">
        Coming soon
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--cb-ink)]">
        {title}
      </h1>
      <p className="text-base leading-relaxed text-[var(--cb-ink-muted)]">{blurb}</p>
      <p className="text-sm text-[var(--cb-ink-muted)]">
        Migrating… Full tool UI lands in a later PR. This route is a shell stub
        so the hub link is not a 404.
      </p>
      <Link
        href="/apps"
        className="mt-2 inline-flex w-fit items-center rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-4 py-2 text-sm font-medium text-[var(--cb-ink)] shadow-[var(--cb-shadow)] transition hover:opacity-90"
      >
        ← Apps
      </Link>
    </main>
  );
}

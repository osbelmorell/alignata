import Link from "next/link";

export function ToolStub({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Build · Enterprise
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        {title}
      </h1>
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Migrating… Full tool UI lands in a later PR. This route is a shell stub
        in the monorepo hub.
      </p>
      <Link
        href="/"
        className="text-sm text-zinc-400 underline-offset-4 hover:text-emerald-300 hover:underline"
      >
        ← Back to hub
      </Link>
    </main>
  );
}

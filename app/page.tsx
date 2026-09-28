import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-10">
      <section
        className="p-8"
        style={{
          background: "var(--cb-surface)",
          borderRadius: "var(--cb-radius-squircle)",
          boxShadow: "var(--cb-shadow)",
          border: "1px solid var(--cb-line)",
        }}
      >
        <p
          className="mb-3 inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={{ background: "var(--cb-lime)", color: "var(--cb-lime-ink)" }}
        >
          Build
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Alignata
        </h1>
        <p className="mt-3 text-[16px]" style={{ color: "var(--cb-ink-muted)" }}>
          Build tools for busy humans
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/apps"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-[14px] font-medium text-white"
            style={{ background: "#121410" }}
          >
            Tools
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-[14px] font-medium"
            style={{
              background: "var(--cb-surface)",
              border: "1px solid var(--cb-line)",
              color: "var(--cb-ink)",
            }}
          >
            Blog
          </Link>
        </div>
      </section>

      <p className="text-[14px]" style={{ color: "var(--cb-ink-muted)" }}>
        Tools live on this site at{" "}
        <Link
          href="/apps"
          className="underline underline-offset-2"
          style={{ color: "var(--cb-ink)" }}
        >
          /apps
        </Link>
        .
      </p>

      <footer
        className="pb-4 text-[12px]"
        style={{ color: "var(--cb-ink-muted)" }}
      >
        Alignata · Build tools for busy humans
      </footer>
    </div>
  );
}

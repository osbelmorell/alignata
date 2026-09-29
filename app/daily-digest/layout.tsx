export default function DailyDigestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      {children}
      <footer
        className="mt-12 pb-4 text-[12px]"
        style={{ color: "var(--cb-ink-muted)" }}
      >
        Alignata · Build tools for busy humans
      </footer>
    </div>
  );
}

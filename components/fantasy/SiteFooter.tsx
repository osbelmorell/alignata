import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="fx-footer">
      <div className="fx-wrap">
        <p>Alignata · Build tools for busy humans</p>
        <nav aria-label="Footer">
          <Link href="/apps">Tools</Link>
          <Link href="/daily-digest">Daily Digest</Link>
        </nav>
      </div>
    </footer>
  );
}

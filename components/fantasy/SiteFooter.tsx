import Link from "next/link";
import { FOOTER_LINE, FOOTER_LINKS } from "@/content/company";

/**
 * Site footer, identical on every page that has one (company pages SPEC §6 + COPY.md "Split release notes"): the company
 * line "© 2026 Alignata", then the footer links. Phone: line on top, links in a two-column grid (Tools · Daily Digest /
 * About · …). Desktop: line left, links in one row on the right. Every link is a ≥ 44×48 tap target. Each link has an
 * explicit data-home-target so a tap on `/` is counted as nav:footer-<name> (never derived as a tool slug).
 */
export function SiteFooter() {
  return (
    <footer className="fx-footer">
      <div className="fx-wrap">
        <p className="fx-footer-co">{FOOTER_LINE}</p>
        <nav aria-label="Footer" className="fx-footer-nav">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} data-home-target={l.target}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { BackLink } from "@/components/site/BackLink";

/**
 * 404: the same words as Next's built-in not-found page, plus the shared site footer, so every page (tool routes and
 * unknown URLs included) ends with the same 4-link footer (HANDOFF-COMPANY §2, HANDOFF-PRICE-CARD §1.8).
 */
export default function NotFound() {
  return (
    <>
      <BackLink href="/" label="Home" />
      <main className="fx-page fx-wrap" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h1 className="fx-story-title">404</h1>
        <p className="fx-story-dek">This page could not be found.</p>
      </main>
      <SiteFooter />
    </>
  );
}

import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { PageFade } from "@/components/appstore/Motion";

/**
 * The fade sits outside the wrapper div: React only plays enter/exit for a <ViewTransition> that isn't inside a
 * freshly inserted DOM node, so arriving here from /, /apps or a tool story still crossfades. Between the index and
 * an article this layout stays put and the page-level <PageFade> inside takes over.
 */
export default function DailyDigestLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageFade>
      <div className="fx-page">
        {children}
        <SiteFooter />
      </div>
    </PageFade>
  );
}

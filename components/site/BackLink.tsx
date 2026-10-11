import Link from "next/link";
import { ShareButton } from "@/components/site/ShareButton";

/** Restyle C: the one back link. Always on the site container (.fx-wrap), directly under the header, so it sits at the
 *  same x on every subpage (lists, stories, articles, company pages, guides, tool routes, 404).
 *  Share (Oct 11 2026): articles, tool stories and /daily-digest pass `share`; the soft Share pill sits right-aligned
 *  in this same 44px row, so adding it never moves the page (CLS 0). */
export function BackLink({ href, label, share }: { href: string; label: string; share?: { path: string; slug: string; label: string; title: string } }) {
  return (
    <div className="fx-wrap fx-back" {...(share ? { "data-share-row": "" } : {})}>
      <Link href={href} data-back={href}>
        <span aria-hidden="true">←</span> {label}
      </Link>
      {share ? <ShareButton {...share} live /> : null}
    </div>
  );
}

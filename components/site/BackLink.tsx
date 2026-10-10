import Link from "next/link";

/** Restyle C: the one back link. Always on the site container (.fx-wrap), directly under the header, so it sits at the
 *  same x on every subpage (lists, stories, articles, company pages, guides, tool routes, 404). */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="fx-wrap fx-back">
      <Link href={href} data-back={href}>
        <span aria-hidden="true">←</span> {label}
      </Link>
    </div>
  );
}

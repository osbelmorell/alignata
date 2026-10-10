import Link from "next/link";

/** Restyle C: the one back link, same place on every subpage (under the header, above the page head). */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <p className="fx-back">
      <Link href={href} data-back={href}>
        <span aria-hidden="true">←</span> {label}
      </Link>
    </p>
  );
}

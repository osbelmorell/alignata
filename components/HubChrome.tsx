"use client";

import { usePathname } from "next/navigation";
import { COMPANY_PATHS } from "@/content/company";
import { BackLink } from "@/components/site/BackLink";

/**
 * Tool-route back link (restyle C): on the 10 tool routes only, the shared "← Tools" BackLink, same place and x as on
 * every other subpage. Pages that render their own BackLink (home, /apps, /apps/<slug>, /daily-digest, /guides/<slug>,
 * company pages, 404) and the retired /env-diff (its page has its one link back to the tools) get nothing here.
 */
export function HubChrome({ toolPaths }: { toolPaths: string[] }) {
  const pathname = usePathname() || "/";
  const hide =
    pathname === "/" ||
    pathname === "/apps" ||
    pathname.startsWith("/apps/") ||
    pathname.startsWith("/daily-digest") ||
    pathname.startsWith("/guides/") ||
    pathname === "/env-diff" ||
    COMPANY_PATHS.includes(pathname) ||
    !toolPaths.includes(pathname);
  if (hide) return null;
  return <BackLink href="/apps" label="Tools" />;
}

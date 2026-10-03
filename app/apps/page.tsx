import type { Metadata } from "next";
import { ToolsList } from "@/components/appstore/ToolsList";
import { getApps, toolsOrder } from "@/lib/apps";
import { RetiredStorageCleanup } from "@/components/site/RetiredStorageCleanup";

export const metadata: Metadata = {
  title: "Tools",
  description: "Small tools that each do one job.",
};

export default function AppsPage() {
  return (
    <>
      <ToolsList apps={toolsOrder(getApps())} />
      <RetiredStorageCleanup />
    </>
  );
}

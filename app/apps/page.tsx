import type { Metadata } from "next";
import { ToolsPage } from "@/components/fantasy/ToolsPage";
import { getApps, toolsOrder } from "@/lib/apps";

export const metadata: Metadata = {
  title: "Tools",
  description: "Small tools that each do one job.",
};

export default function AppsPage() {
  return <ToolsPage apps={toolsOrder(getApps())} />;
}

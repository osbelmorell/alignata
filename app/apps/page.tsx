import type { Metadata } from "next";
import { AppHub } from "@/components/AppHub";
import { getApps } from "@/lib/apps";

export const metadata: Metadata = {
  title: "Apps",
  description: "Launcher for all Build apps — scorecards, digests, decision cards, and more.",
};

export default function AppsPage() {
  const apps = getApps();
  return <AppHub apps={apps} />;
}

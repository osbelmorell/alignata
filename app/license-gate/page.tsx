import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "License Risk Gate",
  description: "Drop a lockfile and see if license risk is a pass or fail.",
};

export default function Page() {
  return (
    <ToolStub
      title="License Risk Gate"
      blurb="Drop a lockfile and see if license risk is a pass or fail."
    />
  );
}

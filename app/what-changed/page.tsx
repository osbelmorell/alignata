import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "What Changed",
  description: "Ship card: what moved since last week.",
};

export default function Page() {
  return (
    <ToolStub
      title="What Changed"
      blurb="Ship card: what moved since last week."
    />
  );
}

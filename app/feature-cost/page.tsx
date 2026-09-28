import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "Feature Cost",
  description: "Roll up feature cost from usage logs.",
};

export default function Page() {
  return (
    <ToolStub
      title="Feature Cost"
      blurb="Roll up feature cost from usage logs."
    />
  );
}

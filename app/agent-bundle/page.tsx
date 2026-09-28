import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "Agent Bundle Tag",
  description: "Tag and diff agent bundles.",
};

export default function Page() {
  return (
    <ToolStub
      title="Agent Bundle Tag"
      blurb="Tag and diff agent bundles."
    />
  );
}

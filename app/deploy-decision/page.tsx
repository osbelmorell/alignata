import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "Deploy Decision",
  description: "Kill / hold / ship decision card.",
};

export default function Page() {
  return (
    <ToolStub
      title="Deploy Decision"
      blurb="Kill / hold / ship decision card."
    />
  );
}

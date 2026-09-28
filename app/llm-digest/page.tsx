import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "LLM Digest",
  description: "Weekly digest of LLM product moves.",
};

export default function Page() {
  return (
    <ToolStub
      title="LLM Digest"
      blurb="Weekly digest of LLM product moves."
    />
  );
}

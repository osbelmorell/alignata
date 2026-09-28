import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "LLM Digest post",
  description: "Digest post — full UI landing with content.",
};

export default function Page() {
  return (
    <ToolStub
      title="LLM Digest post"
      blurb="Full post UI and content are merging in from the Build hub."
    />
  );
}

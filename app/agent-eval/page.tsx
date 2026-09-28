import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "Agent Eval",
  description: "Score agent runs locally.",
};

export default function Page() {
  return (
    <ToolStub
      title="Agent Eval"
      blurb="Score agent runs locally."
    />
  );
}

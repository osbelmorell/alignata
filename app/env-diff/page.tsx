import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "Env Diff",
  description: "Diff two env files with secrets masked.",
};

export default function Page() {
  return (
    <ToolStub
      title="Env Diff"
      blurb="Diff two env files with secrets masked."
    />
  );
}

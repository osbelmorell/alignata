import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "Scorecard",
  description: "Pillar scorecard for Build bets.",
};

export default function Page() {
  return (
    <ToolStub
      title="Scorecard"
      blurb="Pillar scorecard for Build bets."
    />
  );
}

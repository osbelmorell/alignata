import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "Stripe Cleaver",
  description: "Split Stripe CSV exports into clean slices.",
};

export default function Page() {
  return (
    <ToolStub
      title="Stripe Cleaver"
      blurb="Split Stripe CSV exports into clean slices."
    />
  );
}

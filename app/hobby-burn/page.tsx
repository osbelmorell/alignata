import type { Metadata } from "next";
import { ToolStub } from "@/components/ToolStub";

export const metadata: Metadata = {
  title: "Hobby Burn",
  description: "Digest Hobby plan burn.",
};

export default function Page() {
  return (
    <ToolStub
      title="Hobby Burn"
      blurb="Digest Hobby plan burn."
    />
  );
}

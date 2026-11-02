import { handleStats } from "@/lib/engrave-merge/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public read of the Engrave Merge 14-day kill bar (counts only).
 * The store is read on the server. The body is aggregates plus the window.
 */
export async function GET() {
  return handleStats();
}

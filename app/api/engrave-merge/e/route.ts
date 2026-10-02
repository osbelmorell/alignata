import { handleEvent } from "@/lib/engrave-merge/handler";

/** Short alias used by the page's sendBeacon (SPEC §8.1). Same handler as /api/engrave-merge/event. */
export async function POST(request: Request) {
  return handleEvent(request);
}

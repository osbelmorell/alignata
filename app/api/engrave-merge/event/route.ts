import { handleEvent } from "@/lib/engrave-merge/handler";

/** Engrave Merge count events. Safe no-op (204) until the Upstash Redis env vars exist. */
export async function POST(request: Request) {
  return handleEvent(request);
}

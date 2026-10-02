import { handleSiteEvent } from "@/lib/site/handler";

/** First-party site events (page_view, apps_view, tool_open, article_view). See lib/site/events.ts. */
export async function POST(request: Request) {
  return handleSiteEvent(request);
}

import type { BeforeSendEvent } from "@vercel/analytics/next";
import { stripRefParam } from "@/lib/engrave-merge/ref";

/**
 * The ONE Vercel Analytics beforeSend: null when analytics is disabled for this visit (automated browser, owner device
 * or dogfood session: the same rule as first-party events), otherwise the event with only `ref` removed from its URL,
 * so a guide's ?ref= is never reported to Vercel whatever the address-bar timing.
 */
export function vaBeforeSend(event: BeforeSendEvent, disabled: boolean): BeforeSendEvent | null {
  if (disabled) return null;
  return { ...event, url: stripRefParam(event.url) };
}

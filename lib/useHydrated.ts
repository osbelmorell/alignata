import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false on the server and during hydration, true afterwards (and on client-side
 * navigations). Lets desks keep their "render a placeholder until mounted" behaviour
 * without calling setState inside an effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

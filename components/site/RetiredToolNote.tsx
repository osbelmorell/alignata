"use client";

import { useLayoutEffect, useState } from "react";
import { cleanRetiredToolStorage, wipeThenConfirm } from "@/lib/site/retired-storage";

/** COPY.md §8 (HANDOFF-ENVDIFF.md §2): the retired page's dek. */
export const RETIRED_DELETED_LINE = "Anything it saved on this device has been deleted.";

/**
 * Client only. The storage wipe runs synchronously in a layout effect; the "has been deleted" line renders only after
 * it returns and only when the wipe verifiably completed. Never in the server HTML (initial state is false).
 */
export function RetiredToolNote() {
  const [deleted, setDeleted] = useState(false);
  useLayoutEffect(() => {
    wipeThenConfirm(cleanRetiredToolStorage, setDeleted);
  }, []);
  return deleted ? (
    <p className="fx-story-dek" data-storage-deleted="">
      {RETIRED_DELETED_LINE}
    </p>
  ) : null;
}

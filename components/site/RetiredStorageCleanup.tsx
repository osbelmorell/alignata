"use client";

import { useEffect } from "react";
import { cleanRetiredToolStorage } from "@/lib/site/retired-storage";

/** Deletes storage left by retired tools (lib/site/retired-storage.ts) once per page load. Renders nothing. */
export function RetiredStorageCleanup() {
  useEffect(() => {
    cleanRetiredToolStorage();
  }, []);
  return null;
}

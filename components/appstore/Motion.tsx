"use client";
import * as React from "react";
import { MOTION_ON } from "@/lib/motion";

/**
 * React <ViewTransition> (bundled React canary in the Next App Router; NEXTJS-TRANSITIONS.md). Missing outside Next
 * (plain react 19.2 in the test runner) or when the motion switch is off: then these render their children only.
 */
const VT = (React as unknown as { ViewTransition?: React.ComponentType<React.ViewTransitionProps> }).ViewTransition;
/**
 * Installed PWA (iOS home-screen / any standalone display mode): no view transitions. On iPhone standalone, taps into the
 * Daily Digest took ~10s while the server answered in <0.35s (Oct 16 2026); React holds each navigation commit for the
 * view transition. Decided once on the client; <ViewTransition> renders no DOM, so the server HTML still hydrates.
 */
const standalone =
  typeof window !== "undefined" &&
  ((navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches));
const active = MOTION_ON && !!VT && !standalone;

/** Shared-element morph: the card side and the story side use the same name; nothing else animates (default="none"). */
export function Morph({ name, children }: { name: string; children: React.ReactNode }) {
  if (!active || !VT) return <>{children}</>;
  return (
    <VT name={name} share="morph" default="none">
      {children}
    </VT>
  );
}

/**
 * Page-level fade (in each page.tsx, not the layout, so enter/exit fire on navigation). Top-level pages crossfade in
 * 150ms; a story's body fades in over 200ms. No slides.
 */
export function PageFade({ story = false, children }: { story?: boolean; children: React.ReactNode }) {
  if (!active || !VT) return <>{children}</>;
  return (
    <VT enter={story ? "fx-fade-story" : "fx-fade"} exit="fx-fade" default="none">
      {children}
    </VT>
  );
}

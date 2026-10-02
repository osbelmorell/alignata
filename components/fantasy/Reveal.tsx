"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * SPEC §4 motion: each .fx-reveal element below the fold fades in and rises 8px once as it enters view
 * (240ms ease-out, CSS in app/fantasy.css). Elements already on screen are left untouched, nothing is
 * hidden before this runs, and prefers-reduced-motion turns it off entirely.
 */
export function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("fx-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -5% 0px" },
    );
    for (const el of document.querySelectorAll<HTMLElement>(".fx-reveal:not(.fx-pending)")) {
      if (el.getBoundingClientRect().top < window.innerHeight) continue; // already in view: leave it
      el.classList.add("fx-pending");
      io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);
  return null;
}

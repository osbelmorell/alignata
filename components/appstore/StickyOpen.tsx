"use client";

import { useEffect, useRef, useState } from "react";
import type { HubApp } from "@/lib/types";
import { OpenPill } from "@/components/appstore/AppRow";
import { Img } from "@/components/appstore/Img";

/**
 * Sticky Open bar, tool stories only (SPEC v2 §4 + v2.3 calls 3/3a): shown whenever NO in-page black Open is in the
 * viewport, at any scroll position including load, so there is never a second black pill on screen and the bar can
 * never sit over an Open. Hiding is instant; the slide-up only plays when the user scrolled it in (and only with
 * motion on, CSS). It is the only fixed-bottom element on the site. A spacer after the footer keeps the page end clear.
 */
export function StickyOpen({ app, pos, icon, iconAlt }: { app: HubApp; pos: number; icon: string; iconAlt: string }) {
  const bar = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [animate, setAnimate] = useState(false);
  const last = useRef<boolean | null>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const update = (e?: Event) => {
      const h = window.innerHeight;
      const inPage = [...document.querySelectorAll<HTMLAnchorElement>("a.fx-open.fx-primary")].filter((a) => !el.contains(a));
      const anyIn = inPage.some((a) => {
        const r = a.getBoundingClientRect();
        return r.bottom > 0 && r.top < h;
      });
      const show = !anyIn;
      if (show === last.current) return;
      setAnimate(last.current !== null && e?.type === "scroll" && show);
      last.current = show;
      setOn(show);
    };
    const onEvent = (e: Event) => update(e);
    window.addEventListener("scroll", onEvent, { passive: true });
    window.addEventListener("resize", onEvent);
    window.addEventListener("load", onEvent);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => update()) : null;
    ro?.observe(document.body);
    void document.fonts?.ready.then(() => update());
    update();
    return () => {
      window.removeEventListener("scroll", onEvent);
      window.removeEventListener("resize", onEvent);
      window.removeEventListener("load", onEvent);
      ro?.disconnect();
    };
  }, []);

  return (
    <div
      ref={bar}
      className={`fx-sticky-open${on ? " fx-on" : ""}${animate ? " fx-slide" : ""}`}
      role="region"
      aria-label={`Open ${app.name}`}
      aria-hidden={!on}
      data-sticky-open=""
    >
      <div className="fx-wrap">
        <Img className="fx-icon" src={icon} alt={iconAlt} width={256} height={256} decoding="async" />
        <p className="fx-app-name">{app.name}</p>
        <OpenPill app={app} pos={pos} primary tabIndex={on ? 0 : -1} src="sticky" />
      </div>
    </div>
  );
}

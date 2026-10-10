"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import type { gsap } from "@/lib/gsap";
import { stageIsArmed, stageReleased } from "./experience/stageBeats";

/**
 * The live Lenis instance, or null when smoothing is off (touch, narrow
 * windows, reduced motion). The Hero -> Work transition needs it to hold the
 * page still while it plays and to move the scroll position without Lenis
 * fighting it afterwards. Lenis setup itself stays in this one component.
 */
let current: Lenis | null = null;

export function getLenis() {
  return current;
}

/**
 * Lenis owns the scroll position only. It never animates page elements and
 * never decides section state (doc/MOTION_ARCHITECTURE.md).
 *
 * Enabled for fine-pointer desktop with normal motion preferences.
 * Touch and `prefers-reduced-motion: reduce` keep native scrolling.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia(
      "(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );

    let lenis: Lenis | null = null;
    let animation: typeof gsap | null = null;
    let loading = false;
    let generation = 0;

    const tick = (time: number) => {
      lenis?.raf(time * 1000);
    };

    const start = async () => {
      if (lenis || loading) return;
      loading = true;
      const request = ++generation;
      try {
        const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([
          import("lenis"), import("@/lib/gsap"),
        ]);
        if (request !== generation || !query.matches) return;
        animation = gsap;
        lenis = new Lenis({
          duration: 1.05,
          smoothWheel: true,
          syncTouch: false,
          wheelMultiplier: 1,
        });
        lenis.on("scroll", ScrollTrigger.update);
        current = lenis;
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        if (stageIsArmed() && !stageReleased()) lenis.stop();
      } finally {
        if (request === generation) loading = false;
      }
    };

    const stop = () => {
      generation++;
      loading = false;
      if (!lenis) return;
      animation?.ticker.remove(tick);
      animation?.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      lenis = null;
      current = null;
    };

    const sync = () => {
      if (query.matches) void start().catch(() => { /* Native scrolling remains available. */ });
      else stop();
    };

    sync();
    query.addEventListener("change", sync);

    return () => {
      query.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return null;
}

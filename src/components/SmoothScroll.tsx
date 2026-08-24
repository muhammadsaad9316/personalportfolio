"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

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
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );

    let lenis: Lenis | null = null;

    const tick = (time: number) => {
      lenis?.raf(time * 1000);
    };

    const start = () => {
      if (lenis) return;
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
    };

    const stop = () => {
      if (!lenis) return;
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      lenis = null;
      current = null;
    };

    const sync = () => (query.matches ? start() : stop());

    sync();
    query.addEventListener("change", sync);

    return () => {
      query.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return null;
}

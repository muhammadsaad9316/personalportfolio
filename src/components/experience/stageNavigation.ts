"use client";

import { useEffect } from "react";
import { getLenis } from "@/components/SmoothScroll";
import { handoffBusy } from "./handoff";
import {
  resetStage,
  setStageTravelling,
  settleStage,
  stageIsArmed,
  stageReleased,
  stageTravelling,
} from "./stageBeats";

export type StageDestination = "work" | "cases" | "ending" | "contact";

const HASH_DESTINATIONS: Record<string, StageDestination> = {
  "#work": "work",
  "#case-studies": "cases",
  "#ending": "ending",
  "#contact": "contact",
};

function destinationTop(destination: StageDestination) {
  const stage = document.querySelector<HTMLElement>("[data-experience-stage]");
  const sticky = document.querySelector<HTMLElement>(
    "[data-experience-sticky]",
  );
  if (!stage) return 0;

  const step = sticky?.offsetHeight ?? 0;
  if (destination === "work") return stage.offsetTop;
  if (destination === "cases") return stage.offsetTop + step;

  const chapters = stage.querySelectorAll("[data-case-chapter]").length;
  return stage.offsetTop + (chapters + (destination === "ending" ? 1 : 2)) * step;
}

/** Move into a cinematic rest; native anchors remain the touch fallback. */
export function navigateToStage(destination: StageDestination) {
  if (!stageIsArmed()) return false;
  restoreAt(destinationTop(destination));
  return true;
}

function restoreAt(y: number) {
  resetStage();
  setStageTravelling(true);
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
  setStageTravelling(false);
  settleStage();
}

/** Resolve a requested fragment once; reloads restore the current chapter. */
export function useStageNavigation() {
  useEffect(() => {
    let frame = 0;
    let recovery = 0;
    let modeFrame = 0;
    let changingMode = false;
    const query = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let cinematic = query.matches;
    const panels = [
      "[data-hero-root]", "#work",
      ...Array.from(document.querySelectorAll<HTMLElement>("[data-case-chapter]"), el => `[data-case-chapter="${el.dataset.caseChapter}"]`),
      "#ending", "#contact", "#footer",
    ];
    let reading = 0;
    const stageGeometry = () => {
      const stage = document.querySelector<HTMLElement>("[data-experience-stage]");
      const sticky = document.querySelector<HTMLElement>("[data-experience-sticky]");
      return { top: stage?.offsetTop ?? 0, step: sticky?.offsetHeight ?? 0 };
    };
    const remember = () => {
      if (changingMode || cinematic !== query.matches) return;
      if (cinematic) {
        const { top, step } = stageGeometry();
        if (step) reading = Math.max(0, Math.min(panels.length - 1, Math.round((scrollY - top) / step) + 1));
      } else {
        reading = 0;
        panels.forEach((selector, index) => {
          const el = document.querySelector(selector);
          if (el && el.getBoundingClientRect().top <= innerHeight * .2) reading = index;
        });
      }
    };
    const onScroll = () => {
      remember();
      clearTimeout(recovery);
      if (changingMode || !stageIsArmed() || stageReleased() || stageTravelling() || handoffBusy("stage-recovery")) return;
      const { top, step } = stageGeometry();
      if (!step || scrollY < top - 4 || scrollY > top + (panels.length - 3) * step + 4) return;
      const rest = top + Math.round((scrollY - top) / step) * step;
      if (Math.abs(scrollY - rest) < 1) return;
      // Scrollbars and browser scroll restoration can land between held beats.
      recovery = window.setTimeout(() => {
        if (!changingMode && stageIsArmed() && !stageTravelling() && !handoffBusy("stage-recovery")) restoreAt(rest);
      }, 120);
    };
    const changeMode = () => {
      const index = reading;
      cinematic = query.matches;
      changingMode = true;
      clearTimeout(recovery);
      cancelAnimationFrame(modeFrame);
      modeFrame = requestAnimationFrame(() => {
        modeFrame = requestAnimationFrame(() => {
          if (cinematic && stageIsArmed()) {
            const { top, step } = stageGeometry();
            restoreAt(index === 0 ? 0 : top + (index - 1) * step);
          } else {
            const el = document.querySelector(panels[index]);
            if (el) window.scrollTo(0, scrollY + el.getBoundingClientRect().top);
          }
          changingMode = false;
          remember();
        });
      });
    };
    const restore = (fromHash: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!stageIsArmed()) return;
        const destination = HASH_DESTINATIONS[window.location.hash];
        if (fromHash && destination) navigateToStage(destination);
        else {
          resetStage();
          settleStage();
        }
        onScroll();
      });
    };
    const onLoad = () => {
      const entry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      restore(entry?.type === "navigate");
    };
    // ponytail: fragment Back/Forward restores the named section; add per-entry
    // chapter restoration only if preserving scroll within each hash is needed.
    const onHashChange = () => restore(true);

    // Child and parent layout effects have registered every beat by now.
    // Wait for native scroll restoration before deriving their logical state.
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    query.addEventListener("change", changeMode);
    remember();
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(modeFrame);
      clearTimeout(recovery);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("scroll", onScroll);
      query.removeEventListener("change", changeMode);
    };
  }, []);
}

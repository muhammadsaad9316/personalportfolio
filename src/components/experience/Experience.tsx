"use client";

import { useRef } from "react";
import Hero, { type HeroHandle } from "@/components/hero/Hero";
import Work, { type WorkHandle } from "@/components/work/Work";
import CaseStudies from "@/components/cases/CaseStudies";
import { useHeroToWork } from "./heroToWork";
import { useWorkToCases } from "./workToCases";
import styles from "./Experience.module.css";

/**
 * The shared wrapper for the three scenes that hand over to each other.
 *
 * It owns no section motion of its own. Hero, Work and Case Studies each keep
 * their local timelines; this file only holds the DOM the two transitions need
 * to reach across, and calls one hook for each:
 *
 *   useHeroToWork   — `hero-to-work`, gesture driven (see heroToWork.ts)
 *   useWorkToCases  — `work-to-cases`, gesture driven (see workToCases.ts)
 *
 * Both are driven by scroll intent rather than scroll position: one gesture
 * plays a whole move at its own pace while the page is held still. They share
 * one lock so neither reacts while the other is playing (see handoff.ts).
 *
 * The stage below is what makes the second one possible. Work and the first
 * case study are two children of one sticky, viewport-height grid cell, so the
 * Salam Cargo frame can travel from one layout to the other without ever
 * leaving the document — the same element, moved, not a copy faded in.
 */
export default function Experience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const heroInnerRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const hero = useRef<HeroHandle>(null);
  const work = useRef<WorkHandle>(null);

  useHeroToWork({
    rootRef,
    sceneRef,
    heroInnerRef,
    washRef,
    stageRef,
    hero,
    work,
  });
  useWorkToCases({ rootRef, stageRef, stickyRef, work });

  return (
    <div ref={rootRef} className={styles.experience}>
      <div ref={sceneRef} className={styles.heroScene}>
        <div ref={heroInnerRef} className={styles.heroInner}>
          <Hero ref={hero} />
        </div>
      </div>

      <div ref={stageRef} className={styles.stage} data-experience-stage>
        <div
          ref={stickyRef}
          className={styles.stageSticky}
          data-experience-sticky
        >
          <Work ref={work} />
          <CaseStudies />
        </div>
      </div>

      {/* Fixed so it covers the viewport through the scroll jump. */}
      <div ref={washRef} className={styles.wash} aria-hidden="true" />
    </div>
  );
}

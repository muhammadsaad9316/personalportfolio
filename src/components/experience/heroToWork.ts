"use client";

import type { RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { HeroHandle } from "@/components/hero/Hero";
import type { WorkHandle } from "@/components/work/Work";
import { getLenis } from "@/components/SmoothScroll";
import { registerStageBeat } from "./stageBeats";
import {
  DOWN_KEYS,
  UP_KEYS,
  claimHandoff,
  handoffBusy,
  keyStep,
  releaseHandoff,
  wheelStep,
} from "./handoff";

/**
 * The `hero-to-work` handoff, and nothing else. Called by the Experience
 * wrapper, which is the nearest shared parent of the two scenes.
 *
 * Hero and Work keep their own local timelines; this file animates only the
 * hero's PARENT groups (`[data-hero-fade]`, `[data-hero-backdrop]`) and asks
 * Work for its own entrance/exit through an imperative handle, so neither
 * section's properties get a second owner.
 *
 * The transition is deliberately NOT scroll-linked: one gesture — a wheel
 * notch, a trackpad flick, Page Down — plays the whole move and lands Work
 * framed. It is therefore a GSAP timeline driven by scroll INTENT, not a
 * ScrollTrigger reading progress. That is a deliberate departure from the
 * "one ScrollTrigger" note in doc/MOTION_ARCHITECTURE.md, and `work-to-cases`
 * now works the same way, so the two handoffs read as one gesture repeated.
 *
 * The shirt carries the cover. The figure is scaled about a point on his lower
 * torso — the widest uninterrupted run of fabric in the cut-out — far enough
 * that the fabric passes every screen edge while still SOLID. Only once the
 * frame is entirely shirt does the cream wash come in, so the figure never
 * dissolves into a transparent ghost of arms and watch.
 */

/** Origin of the dolly, as a fraction of the DRAWN figure. */
const TORSO_X = 0.52;
const TORSO_Y = 0.73;
/** Usable fabric around that origin, same units. */
const FABRIC_W = 0.62;
const FABRIC_H = 0.24;
/** Past this the upscale starts to show. Measured against the 1300px source. */
const MAX_ZOOM = 9.5;
const PERSON_AR = 1300 / 2984;

/* Forward beats (seconds). */
const F_ZOOM_AT = 0.12;
const F_ZOOM_DUR = 1.05;
/** The wash waits until the fabric has passed every edge. */
const F_WASH_AT = F_ZOOM_AT + F_ZOOM_DUR * 0.86;
const F_WASH_DUR = 0.34;
const F_SWAP_AT = F_WASH_AT + F_WASH_DUR;
const F_CLEAR_AT = F_SWAP_AT + 0.06;
const F_CLEAR_DUR = 0.5;

/* Backward beats (seconds). */
const B_WASH_AT = 0.78;
const B_WASH_DUR = 0.36;
const B_SWAP_AT = B_WASH_AT + B_WASH_DUR;
const B_CLEAR_AT = B_SWAP_AT + 0.04;
const B_ZOOM_DUR = 0.95;

/** This handoff's name in the shared lock. `work-to-cases` starts where this
 *  one lands and listens to the same wheel, so neither may react while the
 *  other is playing. See ./handoff.ts. */
const ID = "hero-to-work";

export type HeroToWorkRefs = {
  rootRef: RefObject<HTMLDivElement | null>;
  sceneRef: RefObject<HTMLDivElement | null>;
  heroInnerRef: RefObject<HTMLDivElement | null>;
  washRef: RefObject<HTMLDivElement | null>;
  /** The Work -> Case Studies stage. Its top is where the hero hands over. */
  stageRef: RefObject<HTMLDivElement | null>;
  hero: RefObject<HeroHandle | null>;
  work: RefObject<WorkHandle | null>;
};

export function useHeroToWork({
  rootRef,
  sceneRef,
  heroInnerRef,
  washRef,
  stageRef,
  hero,
  work,
}: HeroToWorkRefs) {
  useGSAP(
    () => {
      const scene = sceneRef.current;
      const heroInner = heroInnerRef.current;
      const wash = washRef.current;
      const workEl = stageRef.current;
      if (!scene || !heroInner || !wash || !workEl) return;

      const q = gsap.utils.selector(heroInner);
      const mm = gsap.matchMedia();

      /* --------------------------------------------------------------
       * Touch, narrow windows and reduced motion: nothing is intercepted.
       * The hero scrolls away and Work follows on the same cream.
       * ------------------------------------------------------------ */
      mm.add(
        "(max-width: 899px), (prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)",
        () => {
          gsap.set(
            [
              q("[data-hero-fade]"),
              q("[data-hero-backdrop]"),
              q("[data-hero-person]"),
            ],
            { clearProps: "opacity,visibility,transform,transformOrigin" },
          );
          gsap.set([heroInner, scene], { autoAlpha: 1 });
          gsap.set(wash, { autoAlpha: 0 });
        },
      );

      /* --------------------------------------------------------------
       * Desktop, fine pointer, normal motion: the cinematic handoff.
       * ------------------------------------------------------------ */
      mm.add(
        "(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const person =
            heroInner.querySelector<HTMLElement>("[data-hero-person]");
          let phase: "hero" | "playing" | "work" = "hero";
          let entered = false;
          let running: gsap.core.Timeline | null = null;

          const workTop = () => workEl.offsetTop;

          /** Park the dolly origin on his lower torso and work out how far he
           *  must come forward for that fabric to pass every screen edge. */
          const measure = () => {
            if (!person) return 8;
            const boxW = person.offsetWidth;
            const boxH = person.offsetHeight;
            const drawH = Math.min(boxH, boxW / PERSON_AR);
            const drawW = drawH * PERSON_AR;
            gsap.set(person, {
              transformOrigin: `${(((boxW - drawW) / 2 + drawW * TORSO_X) / boxW) * 100}% ${
                ((boxH - drawH + drawH * TORSO_Y) / boxH) * 100
              }%`,
            });
            return Math.min(
              MAX_ZOOM,
              Math.max(
                window.innerWidth / (drawW * FABRIC_W),
                window.innerHeight / (drawH * FABRIC_H),
              ),
            );
          };

          /* ---------------- scroll lock ---------------- */
          const swallow = (event: Event) => event.preventDefault();
          const swallowKeys = (event: KeyboardEvent) => {
            if (DOWN_KEYS.has(event.key) || UP_KEYS.has(event.key)) {
              event.preventDefault();
            }
          };

          const hold = () => {
            getLenis()?.stop();
            window.addEventListener("wheel", swallow, { passive: false });
            window.addEventListener("touchmove", swallow, { passive: false });
            window.addEventListener("keydown", swallowKeys, { passive: false });
          };

          const unswallow = () => {
            window.removeEventListener("wheel", swallow);
            window.removeEventListener("touchmove", swallow);
            window.removeEventListener("keydown", swallowKeys);
          };

          /**
           * Arrive at a rest position: stop swallowing, but keep the page
           * still. Hero and Work are both rests that wait for a gesture, and
           * so is every position `work-to-cases` and `case-featured` land on.
           *
           * This is the invariant the whole stage depends on: `scrollY` is
           * only ever exactly a rest position. The `atWorkTop()` guard below —
           * and `atCasesTop()`, `onStage()`, `onChapters()` in the two files
           * downstream — are all ±4px tests, which are only sound while
           * nothing can drift the scroll between rests. Leaving Lenis running
           * here was what let the tail of a flick scroll off Work, silently
           * disable `atWorkTop()`, and strand the viewport in the hidden
           * hero's region as a blank cream screen.
           */
          const rest = () => {
            unswallow();
            getLenis()?.stop();
          };

          /** Full release. Only for teardown, where the page must scroll again. */
          const release = () => {
            unswallow();
            getLenis()?.start();
          };

          const jumpTo = (y: number) => {
            const lenis = getLenis();
            // Move Lenis' own position too, or it snaps back on start().
            if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
            else window.scrollTo(0, y);
          };

          /** A dolly reads at a constant speed only if scale grows
           *  exponentially. Tweening the exponent keeps the approach even
           *  instead of nothing-then-everything. */
          const dolly = (
            tl: gsap.core.Timeline,
            from: number,
            to: number,
            duration: number,
            at: number,
          ) => {
            const state = { t: from };
            tl.to(
              state,
              {
                t: to,
                duration,
                ease: "power1.inOut",
                onUpdate: () => {
                  if (person) {
                    gsap.set(person, { scale: Math.pow(zoom, state.t) });
                  }
                },
              },
              at,
            );
          };

          let zoom = measure();

          /* ---------------- forward ---------------- */
          const buildForward = () => {
            zoom = measure();
            const tl = gsap.timeline({
              onComplete: () => {
                phase = "work";
                running = null;
                rest();
                releaseHandoff(ID);
              },
            });

            // Each group leaves in its own direction, on a stagger.
            tl.to(
              heroInner.querySelectorAll('[data-exit="up"]'),
              {
                y: -34,
                autoAlpha: 0,
                duration: 0.55,
                stagger: 0.08,
                ease: "power2.in",
              },
              0,
            )
              .to(
                heroInner.querySelectorAll('[data-exit="left"]'),
                { x: -48, autoAlpha: 0, duration: 0.55, ease: "power2.in" },
                0.06,
              )
              .to(
                heroInner.querySelectorAll('[data-exit="right"]'),
                { x: 48, autoAlpha: 0, duration: 0.55, ease: "power2.in" },
                0.06,
              )
              // The developer side slides away rather than fading, so the
              // frame never passes through a washed-out grey.
              .to(
                q("[data-hero-backdrop]"),
                { xPercent: 100, duration: 0.75, ease: "power2.inOut" },
                0.05,
              );

            dolly(tl, 0, 1, F_ZOOM_DUR, F_ZOOM_AT);

            tl.to(
              wash,
              { autoAlpha: 1, duration: F_WASH_DUR, ease: "power1.inOut" },
              F_WASH_AT,
            )
              .add(() => {
                jumpTo(workTop());
                gsap.set([heroInner, scene], { autoAlpha: 0 });
                hero.current?.setAmbient(false);
                ScrollTrigger.refresh();
              }, F_SWAP_AT)
              .to(
                wash,
                { autoAlpha: 0, duration: F_CLEAR_DUR, ease: "power2.out" },
                F_CLEAR_AT,
              )
              .add(() => {
                work.current?.enter();
                entered = true;
              }, F_CLEAR_AT + 0.05);

            return tl;
          };

          /* ---------------- backward ---------------- */
          const buildBackward = () => {
            const tl = gsap.timeline({
              onComplete: () => {
                phase = "hero";
                running = null;
                rest();
                releaseHandoff(ID);
              },
            });

            // Work leaves properly before anything else happens.
            tl.add(work.current?.exit() ?? gsap.timeline(), 0)
              .to(
                wash,
                { autoAlpha: 1, duration: B_WASH_DUR, ease: "power1.inOut" },
                B_WASH_AT,
              )
              .add(() => {
                jumpTo(0);
                gsap.set([heroInner, scene], { autoAlpha: 1 });
                work.current?.reset();
                entered = false;
                hero.current?.setAmbient(true);
                ScrollTrigger.refresh();
              }, B_SWAP_AT)
              .to(
                wash,
                { autoAlpha: 0, duration: 0.42, ease: "power2.out" },
                B_CLEAR_AT,
              );

            // He emerges from the cream and pulls away from camera.
            dolly(tl, 1, 0, B_ZOOM_DUR, B_CLEAR_AT);

            // The hero settles back in softly, after he has receded.
            const settleAt = B_CLEAR_AT + 0.3;
            tl.to(
              q("[data-hero-backdrop]"),
              { xPercent: 0, duration: 0.7, ease: "power2.inOut" },
              B_CLEAR_AT,
            )
              .to(
                heroInner.querySelectorAll('[data-exit="up"]'),
                {
                  y: 0,
                  autoAlpha: 1,
                  duration: 0.6,
                  stagger: 0.08,
                  ease: "power2.out",
                },
                settleAt,
              )
              .to(
                heroInner.querySelectorAll(
                  '[data-exit="left"],[data-exit="right"]',
                ),
                { x: 0, autoAlpha: 1, duration: 0.6, ease: "power2.out" },
                settleAt + 0.08,
              );

            return tl;
          };

          const forward = () => {
            if (phase !== "hero" || handoffBusy(ID)) return;
            phase = "playing";
            claimHandoff(ID);
            hold();
            running = buildForward();
          };

          const back = () => {
            if (phase !== "work" || handoffBusy(ID)) return;
            phase = "playing";
            claimHandoff(ID);
            hold();
            running = buildBackward();
          };

          /* ---------------- intent ---------------- */
          const atWorkTop = () => window.scrollY <= workTop() + 4;

          const onWheel = (event: WheelEvent) => {
            /* `work-to-cases` runs from the landing of this one and holds the
               page while it plays. Its scroll position is still `workTop`
               through the whole flight, so without this an upward flick
               mid-move would also satisfy `atWorkTop()` and drag the Hero
               back underneath it. */
            /* Ask the gate first, always — before any bail. It has to see the
               events that arrive mid-move, because those are exactly the ones
               that must not be allowed to queue up a second step. */
            const step = wheelStep(event);
            if (handoffBusy(ID)) return;
            if (phase === "playing") {
              event.preventDefault();
              return;
            }
            if (step === 0) return;
            if (phase === "hero" && step > 0) {
              event.preventDefault();
              forward();
            } else if (phase === "work" && step < 0 && atWorkTop()) {
              event.preventDefault();
              back();
            }
          };

          const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const step = keyStep(event);
            if (handoffBusy(ID) || step === 0) return;
            if (phase === "hero" && step > 0) {
              event.preventDefault();
              forward();
            } else if (phase === "work" && step < 0 && atWorkTop()) {
              event.preventDefault();
              back();
            }
          };

          /** Tabbing into Work from the hero must not scroll past the
           *  transition — settle both to the landed state instead. */
          const onFocusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement | null;
            if (phase === "hero" && target && workEl.contains(target)) {
              phase = "work";
              running?.kill();
              running = null;
              gsap.set([heroInner, scene], { autoAlpha: 0 });
              gsap.set(wash, { autoAlpha: 0 });
              jumpTo(workTop());
              hero.current?.setAmbient(false);
              if (!entered) {
                work.current?.enter();
                entered = true;
              }
              rest();
            }
          };

          const settle = () => {
            if (window.scrollY >= workTop() - 8) {
              // Reloaded partway down: start in the landed state.
              phase = "work";
              gsap.set([heroInner, scene], { autoAlpha: 0 });
              hero.current?.setAmbient(false);
              if (!entered) {
                work.current?.enter();
                entered = true;
              }
            }
            // Either way this is a rest position, so the page stays still.
            rest();
          };
          const settleId = window.setTimeout(settle, 60);

          /* The footer's "Back to top" unwinds the stage through this.
             The reset is the same restore the unmount cleanup performs,
             minus the teardown — and it is the last one to run, because
             the beats it contains have to come apart first. */
          const unregister = registerStageBeat(ID, {
            order: 2,
            reset: () => {
              running?.kill();
              running = null;
              phase = "hero";
              entered = false;
              gsap.set([heroInner, scene], { autoAlpha: 1 });
              gsap.set(wash, { autoAlpha: 0 });
              work.current?.reset();
              hero.current?.setAmbient(true);
            },
            settle,
          });

          window.addEventListener("wheel", onWheel, { passive: false });
          window.addEventListener("keydown", onKey, { passive: false });
          window.addEventListener("focusin", onFocusIn);

          return () => {
            window.clearTimeout(settleId);
            window.removeEventListener("wheel", onWheel);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("focusin", onFocusIn);
            unregister();
            releaseHandoff(ID);
            release();
            running?.kill();
            hero.current?.setAmbient(true);
            gsap.set([heroInner, scene], { autoAlpha: 1 });
            gsap.set(wash, { autoAlpha: 0 });
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );
}

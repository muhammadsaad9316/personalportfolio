"use client";

import type { RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { WorkHandle } from "@/components/work/Work";
import { getLenis } from "@/components/SmoothScroll";
import {
  DOWN_KEYS,
  UP_KEYS,
  claimHandoff,
  handoffBusy,
  releaseHandoff,
} from "./handoff";

/**
 * The `work-to-cases` handoff.
 *
 * Work and the first case study share one sticky viewport-height frame, laid
 * out as a single grid cell so both compositions occupy the same space. One
 * timeline crossfades between them in the documented order: the three
 * secondary previews leave, the wires dissolve, the impact circle shrinks,
 * "Digital products. Real impact." lifts away, the Case Studies title arrives,
 * and the Salam Cargo preview travels from its Work position into the
 * full-bleed left-hand visual of the study.
 *
 * Like `hero-to-work`, the move is driven by scroll INTENT rather than scroll
 * position: one gesture — a wheel notch, a trackpad flick, Page Down — plays
 * the whole thing at its own eased pace and lands the study framed. The page
 * is held still while it runs, so the move can never be dragged frame by frame
 * or left stalled half way. That is the deliberate departure from the "one
 * ScrollTrigger" note in doc/MOTION_ARCHITECTURE.md that both handoffs share.
 *
 * The stage is therefore two rest positions rather than a scrub track: Work at
 * `stage.offsetTop`, the landed study one viewport further down, at the last
 * position the sticky is stuck at. Every scroll position between them looks
 * identical — the sticky covers the whole range — so the jump between them at
 * the end of the move is invisible, and a stray notch that slips through
 * before the hold takes cannot show anything either.
 *
 * The preview is not copied or swapped. The element that flies is the Work
 * card's own `.projectFrame`; the case study's left side is an empty,
 * measured slot that the frame lands on. One paused timeline serves both
 * directions, so `reverse()` retraces the identical path and returns the frame
 * to the card, to the pixel.
 *
 * Geometry is read with offsetLeft/offsetTop rather than getBoundingClientRect
 * so a measurement taken mid-flight — or while Work is still armed with its
 * entrance offsets — reports the untransformed layout box, not the animated
 * one.
 */

/** Real seconds the move takes. The timeline's own units stay abstract and
 *  these set its timeScale, so re-timing one beat never changes the overall
 *  pace, and changing the pace never disturbs the choreography. Sized to match
 *  `hero-to-work`, which runs about 1.9s, so the two handoffs read as the same
 *  gesture rather than two different mechanisms. */
const FORWARD_TIME = 1.9;
/** Coming back is a little quicker, as it is on the Hero handoff. */
const BACK_TIME = 1.5;
/** Tiny overlap prevents sub-pixel seams around the full-bleed landing. */
const FULL_BLEED_OVERSCAN = 2;

/** This handoff's name in the shared lock. */
const ID = "work-to-cases";

const CINEMATIC =
  "(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const STATIC =
  "(max-width: 899px), (prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)";

/** Layout position of `el` inside `root`, ignoring every transform on the way
 *  up. Both elements must share the same offsetParent chain. */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

export type WorkToCasesRefs = {
  rootRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  stickyRef: RefObject<HTMLDivElement | null>;
  work: RefObject<WorkHandle | null>;
};

export function useWorkToCases({
  rootRef,
  stageRef,
  stickyRef,
  work,
}: WorkToCasesRefs) {
  useGSAP(
    () => {
      const stage = stageRef.current;
      const sticky = stickyRef.current;
      if (!stage || !sticky) return;

      const frame = stage.querySelector<HTMLElement>("[data-flight-frame]");
      const media = frame?.querySelector<HTMLElement>("img");
      const slot = stage.querySelector<HTMLElement>("[data-case-slot]");
      const network = stage.querySelector<HTMLElement>("[data-network]");
      const cases = stage.querySelector<HTMLElement>("[data-cases]");
      if (!frame || !media || !slot || !cases) return;

      const q = gsap.utils.selector(stage);
      const cards = q('[data-cases-out="card"]');
      const cardText = q('[data-cases-out="cardText"]');
      const intro = q('[data-cases-out="intro"]');
      const wires = q('[data-cases-out="wires"]');
      const centre = q('[data-cases-out="centre"]');
      const titleIn = q('[data-cases-in="title"]');
      const studyIn = q('[data-cases-in="study"]');

      const mm = gsap.matchMedia();

      /* --------------------------------------------------------------
       * Desktop, fine pointer, normal motion: the travelling preview.
       * ------------------------------------------------------------ */
      mm.add(CINEMATIC, () => {
        gsap.set(frame, { transformOrigin: "0 0" });
        gsap.set(media, { transformOrigin: "50% 50%" });

        /* How far the frame has to travel, and how far along it currently is.
           Both are read live rather than baked into the tween, so a resize
           part-way through can never leave the frame heading for a stale
           slot. */
        const flight = {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          mediaScaleX: 1,
          mediaScaleY: 1,
        };
        const travel = { t: 0 };

        const apply = () => {
          gsap.set(frame, {
            x: flight.x * travel.t,
            y: flight.y * travel.t,
            scaleX: 1 + (flight.scaleX - 1) * travel.t,
            scaleY: 1 + (flight.scaleY - 1) * travel.t,
          });
          gsap.set(media, {
            scaleX: 1 + (flight.mediaScaleX - 1) * travel.t,
            scaleY: 1 + (flight.mediaScaleY - 1) * travel.t,
          });
        };

        const measure = () => {
          const from = offsetWithin(frame, sticky);
          const to = offsetWithin(slot, sticky);
          const rect = frame.getBoundingClientRect();
          const currentScaleX = 1 + (flight.scaleX - 1) * travel.t;
          const currentScaleY = 1 + (flight.scaleY - 1) * travel.t;
          const width = rect.width / currentScaleX;
          const height = rect.height / currentScaleY;
          const slotRect = slot.getBoundingClientRect();
          if (!width || !height) return;
          flight.x = to.x - from.x - FULL_BLEED_OVERSCAN;
          flight.y = to.y - from.y - FULL_BLEED_OVERSCAN;
          flight.scaleX =
            (slotRect.width + FULL_BLEED_OVERSCAN * 2) / width;
          flight.scaleY =
            (slotRect.height + FULL_BLEED_OVERSCAN * 2) / height;
          const coverScale = Math.max(flight.scaleX, flight.scaleY);
          flight.mediaScaleX = coverScale / flight.scaleX;
          flight.mediaScaleY = coverScale / flight.scaleY;
          /* Re-place it at the progress it is already at. A measurement that
             does not move the playhead — resizing while the study is landed,
             say — would otherwise leave the old distance on screen. */
          apply();
        };
        measure();

        /* Hover belongs to Work while Work is the section on screen. The
           moment it starts leaving, the network stops taking the pointer and
           any active card is released. */
        let leaving = false;
        const setLeaving = (next: boolean) => {
          if (next === leaving) return;
          leaving = next;
          if (network) {
            gsap.set(network, { pointerEvents: next ? "none" : "auto" });
          }
          if (next) work.current?.clearActive();
        };

        /* The case study starts hidden. This has to be a `set`, not the
           `from` half of a `fromTo`: a staggered tween only writes its start
           values when each target's own slice begins, so every element after
           the first would sit there visible until the playhead reached it. */
        gsap.set(titleIn, { y: 28, autoAlpha: 0 });
        gsap.set(studyIn, { y: 24, autoAlpha: 0 });

        /* ---------------- rest positions ---------------- */

        const workTop = () => stage.offsetTop;
        /** The last position the sticky is stuck at: one viewport further down
         *  and the far end of the stage. Derived from layout rather than from
         *  `window.innerHeight`, so it stays exact if the stage height
         *  changes. */
        const casesTop = () =>
          stage.offsetTop + stage.offsetHeight - sticky.offsetHeight;
        /** True once the stage is the section on screen. Keeps a downward
         *  flick in the Hero from launching this move as well as its own. */
        const onStage = () => window.scrollY >= workTop() - 4;

        /* ---------------- scroll lock ---------------- */

        const swallow = (event: Event) => event.preventDefault();
        const swallowKeys = (event: KeyboardEvent) => {
          if (DOWN_KEYS.has(event.key) || UP_KEYS.has(event.key)) {
            event.preventDefault();
          }
        };

        const unswallow = () => {
          window.removeEventListener("wheel", swallow);
          window.removeEventListener("touchmove", swallow);
          window.removeEventListener("keydown", swallowKeys);
        };

        const hold = () => {
          getLenis()?.stop();
          window.addEventListener("wheel", swallow, { passive: false });
          window.addEventListener("touchmove", swallow, { passive: false });
          window.addEventListener("keydown", swallowKeys, { passive: false });
        };

        /** Stop swallowing, but keep the page itself still. Both of this
         *  stage's positions are rest positions waiting for a gesture, exactly
         *  as the Hero is at the top of the page. When the flagship's pinned
         *  chapters land below the study, the `cases` rest is the one that
         *  should start Lenis again instead. */
        const rest = () => {
          unswallow();
          getLenis()?.stop();
        };

        const jumpTo = (y: number) => {
          const lenis = getLenis();
          // Move Lenis' own position too, or it snaps back on start().
          if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
        };

        /* ---------------- the move ---------------- */

        let phase: "work" | "playing" | "cases" = "work";

        /* One paused timeline, played forward and reversed. Not two builds:
           the return has to retrace this exact path for the frame to land back
           in its card to the pixel, which a separately authored reverse cannot
           guarantee. The scroll only jumps once the move is over, so the whole
           flight happens at a single scroll position. */
        const tl = gsap
          .timeline({
            paused: true,
            defaults: { ease: "power2.inOut" },
            onComplete: () => {
              phase = "cases";
              jumpTo(casesTop());
              rest();
              releaseHandoff(ID);
            },
            onReverseComplete: () => {
              phase = "work";
              setLeaving(false);
              jumpTo(workTop());
              rest();
              releaseHandoff(ID);
            },
          })
          // 1. The three secondary previews fade and shrink slightly.
          .to(
            cards,
            { autoAlpha: 0, scale: 0.94, y: 18, duration: 0.26, stagger: 0.05 },
            0,
          )
          // The flagship keeps its picture and loses only its card text.
          .to(cardText, { autoAlpha: 0, y: -12, duration: 0.22 }, 0.06)
          // 2. The connecting lines dissolve.
          .to(wires, { autoAlpha: 0, duration: 0.22 }, 0.1)
          // 4. "Digital products. Real impact." moves up and fades.
          .to(intro, { autoAlpha: 0, y: -44, duration: 0.26 }, 0.14)
          // 3. The impact circle becomes smaller.
          .to(centre, { autoAlpha: 0, scale: 0.72, duration: 0.26 }, 0.16)
          // 5. The section title arrives.
          .to(
            titleIn,
            { autoAlpha: 1, y: 0, duration: 0.24, stagger: 0.06 },
            0.38,
          )
          /* 6. The same frame travels. The proxy carries the progress and
                `apply` reads the measured distance, so the destination is
                resolved on every frame instead of at build time. */
          .to(
            travel,
            { t: 1, duration: 0.4, ease: "power1.inOut", onUpdate: apply },
            0.42,
          )
          .to(
            frame,
            {
              borderRadius: 0,
              boxShadow: "0 0 0 rgba(20, 18, 14, 0)",
              duration: 0.4,
              ease: "power1.inOut",
            },
            0.42,
          )
          // 7. The study's own copy, once the visual has settled.
          .to(
            studyIn,
            { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.045 },
            0.8,
          );

        /** Play the abstract timeline over a fixed number of real seconds. */
        const pace = (seconds: number) => tl.timeScale(tl.duration() / seconds);

        const forward = () => {
          if (phase !== "work" || handoffBusy(ID)) return;
          phase = "playing";
          claimHandoff(ID);
          setLeaving(true);
          hold();
          measure();
          pace(FORWARD_TIME).play();
        };

        const back = () => {
          if (phase !== "cases" || handoffBusy(ID)) return;
          phase = "playing";
          claimHandoff(ID);
          hold();
          // The window may have been resized while the study sat landed.
          measure();
          pace(BACK_TIME).reverse();
        };

        /* ---------------- intent ---------------- */

        const onWheel = (event: WheelEvent) => {
          if (handoffBusy(ID)) return;
          if (phase === "playing") {
            event.preventDefault();
            return;
          }
          if (!onStage()) return;
          /* `hero-to-work` starts Lenis again when it lands, and this stage
             has no free-scrolling region of its own, so take the page still
             back on the first gesture that reaches here. The notch Lenis has
             already consumed cannot show anything: every scroll position on
             the stage renders the same sticky frame. */
          getLenis()?.stop();
          if (phase === "work" && event.deltaY > 0) {
            event.preventDefault();
            forward();
          } else if (phase === "cases" && event.deltaY < 0) {
            event.preventDefault();
            back();
          }
        };

        const onKey = (event: KeyboardEvent) => {
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          if (handoffBusy(ID) || phase === "playing") return;
          if (!onStage()) return;
          getLenis()?.stop();
          if (phase === "work" && DOWN_KEYS.has(event.key)) {
            event.preventDefault();
            forward();
          } else if (phase === "cases" && UP_KEYS.has(event.key)) {
            event.preventDefault();
            back();
          }
        };

        /* A resize changes both boxes. `measure` re-places the frame at the
           progress it is already at, so this stays correct mid-flight and
           while the study sits landed. */
        const onResize = () => measure();

        const settle = () => {
          if (window.scrollY >= casesTop() - 8) {
            // Reloaded on the landed study: start there rather than in Work.
            phase = "cases";
            setLeaving(true);
            measure();
            tl.progress(1);
          }
          if (onStage()) rest();
        };
        const settleId = window.setTimeout(settle, 60);

        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("keydown", onKey, { passive: false });
        window.addEventListener("resize", onResize);

        return () => {
          window.clearTimeout(settleId);
          window.removeEventListener("wheel", onWheel);
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("resize", onResize);
          unswallow();
          releaseHandoff(ID);
          tl.kill();
          getLenis()?.start();
          if (network) gsap.set(network, { pointerEvents: "auto" });
        };
      });

      /* --------------------------------------------------------------
       * Touch, narrow windows and reduced motion: nothing travels. Work
       * and the case study are two ordinary stacked sections, and the
       * slot shows its own copy of the image (see Cases.module.css).
       * ------------------------------------------------------------ */
      mm.add(STATIC, () => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return;
        }

        const copy = [...titleIn, ...studyIn];
        gsap.set(copy, { y: 24, autoAlpha: 0 });

        ScrollTrigger.create({
          id: "cases-intro",
          trigger: cases,
          start: "top 72%",
          once: true,
          onEnter: () =>
            gsap.to(copy, {
              y: 0,
              autoAlpha: 1,
              duration: 0.6,
              stagger: 0.08,
              ease: "power3.out",
            }),
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );
}

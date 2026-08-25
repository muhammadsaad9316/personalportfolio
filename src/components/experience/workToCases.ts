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
  keyStep,
  releaseHandoff,
  wheelStep,
} from "./handoff";

/**
 * The `work-to-cases` handoff.
 *
 * Work and the first case study share one sticky viewport-height frame, laid
 * out as a single grid cell so both compositions occupy the same space. One
 * timeline crossfades between them in the documented order: the three
 * secondary previews leave, the wires dissolve, the impact circle shrinks,
 * "Digital products. Real impact." lifts away, and the Salam Cargo preview
 * travels from its Work position into the full-bleed left-hand visual while
 * the single project title arrives on the right.
 *
 * Like `hero-to-work`, the move is driven by scroll INTENT rather than scroll
 * position: one gesture — a wheel notch, a trackpad flick, Page Down — plays
 * the whole thing at its own eased pace and lands the study framed. The page
 * is held still while it runs, so the move can never be dragged frame by frame
 * or left stalled half way. That is the deliberate departure from the "one
 * ScrollTrigger" note in doc/MOTION_ARCHITECTURE.md that both handoffs share.
 *
 * The handoff has two rest positions: Work at `stage.offsetTop` and the landed
 * study one viewport later. From that seam onward `case-featured` owns the
 * stage, stepping its chapters one gesture at a time — nothing on this stage
 * is scroll-linked.
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
      const media = frame?.querySelector<HTMLImageElement>(
        "[data-flight-media]",
      );
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
      const studyIn = q('[data-cases-in="study"]');

      const mm = gsap.matchMedia();

      /* --------------------------------------------------------------
       * Desktop, fine pointer, normal motion: the travelling preview.
       * ------------------------------------------------------------ */
      mm.add(CINEMATIC, () => {
        gsap.set(frame, { transformOrigin: "0 0" });
        /* GSAP covers the frame with this image itself, at every point of the
           flight, so the element has to fill its box rather than fit inside
           it — `object-fit` would crop a second time, inside a box that is the
           wrong shape for most of the move. The CSS keeps `cover` for the
           static path and for the moment before this runs. */
        gsap.set(media, { transformOrigin: "0 0", objectFit: "fill" });

        /* How far the frame has to travel, and how far along it currently is.
           Both are read live rather than baked into the tween, so a resize
           part-way through can never leave the frame heading for a stale
           slot. */
        const flight = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        const travel = { t: 0 };

        /** The image's own aspect ratio. `naturalWidth` is density-corrected
         *  for a srcset-selected source, but that scales both axes equally, so
         *  the ratio it reports is still the true one. Falls back to the
         *  declared attributes until the file has decoded. */
        const mediaRatio = () => {
          if (media.naturalWidth && media.naturalHeight) {
            return media.naturalWidth / media.naturalHeight;
          }
          const w = Number(media.getAttribute("width"));
          const h = Number(media.getAttribute("height"));
          return w && h ? w / h : 1;
        };

        const apply = () => {
          const sx = 1 + (flight.scaleX - 1) * travel.t;
          const sy = 1 + (flight.scaleY - 1) * travel.t;
          gsap.set(frame, {
            x: flight.x * travel.t,
            y: flight.y * travel.t,
            scaleX: sx,
            scaleY: sy,
          });

          /* Cover the frame's CURRENT box using the image's own ratio.
             Computing it live, rather than interpolating between two endpoint
             scales, is what lets the Work card be a different shape from the
             case-study slot: at rest this reproduces `object-fit: cover`
             inside the card, and at the landing it reproduces the slot's cover
             framing exactly, so the crossfade to the chapter slide underneath
             has nothing to give away.

             The old `max(scaleX, scaleY)` form only agreed with the slide
             because the card frame happened to share the image's aspect ratio.
             With the card fixed at 360:230 it would land the image 48% too
             wide. */
          const ratio = mediaRatio();
          const boxW = frame.offsetWidth * sx;
          const boxH = frame.offsetHeight * sy;
          if (!boxW || !boxH) return;
          const coverW = Math.max(boxW, boxH * ratio);
          gsap.set(media, {
            scaleX: coverW / boxW,
            scaleY: coverW / ratio / boxH,
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
          /* The media's own scale is not stored: `apply` derives it from the
             frame's live box and the image's ratio on every frame. */
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
        gsap.set(studyIn, { y: 24, autoAlpha: 0 });

        /* The case panel is a full-bleed composition sharing Work's grid cell,
           and `.work` is transparent, so anything painted in it shows straight
           through the Work section. `case-featured` arms its first chapter
           visible — right once the study has landed, wrong while Work is still
           on screen, where it put an 826 x 900 screenshot behind the project
           network. This handoff owns the panel's own visibility so it stays
           out of Work entirely.

           Two elements, because `case-featured` owns [data-case-visual] and
           [data-case-chapter] and neither may have a second owner:
             [data-cases]      the panel, including the chapters' 1px rule
             [data-case-slot]  the full-bleed visual and its #eef1f6 ground

           `autoAlpha` and not `display`: the slot has to keep its layout box,
           because the flight measures it. */
        gsap.set([cases, slot], { autoAlpha: 0 });

        /* ---------------- rest positions ---------------- */

        const workTop = () => stage.offsetTop;
        /** One viewport after Work: the seam where the featured case-study
         *  ScrollTrigger begins. The sticky continues through its chapters. */
        const casesTop = () => stage.offsetTop + sticky.offsetHeight;
        const atCasesTop = () => window.scrollY <= casesTop() + 4;
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

        /** Every position on this stage is a rest position that waits for a
         *  gesture — the case-study chapters below are stepped too, not
         *  scrubbed — so the page stays still and only the swallowing stops. */
        const rest = () => {
          unswallow();
          getLenis()?.stop();
        };

        /* Composite the frame only while it is actually moving.
           `will-change: transform` locks a layer's raster scale, and this
           frame grows 2.3x by 4.5x, so leaving it on would keep the landed
           screenshot rasterised at the Work card's size — the whole reason the
           arriving visual looked soft. GSAP owns the property outright; the
           CSS rule that used to set it is gone. */
        const composite = (on: boolean) => {
          gsap.set([frame, media], { willChange: on ? "transform" : "auto" });
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
              composite(false);
              releaseHandoff(ID);
            },
            onReverseComplete: () => {
              phase = "work";
              setLeaving(false);
              jumpTo(workTop());
              rest();
              composite(false);
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
              backgroundColor: "rgba(251, 249, 247, 0)",
              boxShadow: "0 0 0 rgba(20, 18, 14, 0)",
              duration: 0.4,
              ease: "power1.inOut",
            },
            0.42,
          )
          /* The panel arrives just before its own copy does. Its ground is the
             same `--work-cream` the stage is painted in, so on screen this
             changes nothing — it only stops the visual below from being
             painted while Work is up. */
          .set(cases, { autoAlpha: 1 }, 0.78)
          /* The slot appears on the exact frame the flight lands, when the
             travelling frame covers it with the 2px overscan and carries the
             identical image. Any earlier and the full-size screenshot would
             show around the still-arriving frame. */
          .set(slot, { autoAlpha: 1 }, 0.82)
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
          composite(true);
          measure();
          pace(FORWARD_TIME).play();
        };

        const back = () => {
          if (phase !== "cases" || handoffBusy(ID)) return;
          phase = "playing";
          claimHandoff(ID);
          hold();
          composite(true);
          // The window may have been resized while the study sat landed.
          measure();
          pace(BACK_TIME).reverse();
        };

        /* ---------------- intent ---------------- */

        const onWheel = (event: WheelEvent) => {
          /* The gate has to see every event, including the ones that arrive
             while a move is playing — those are the tail of the flick that
             started it, and letting them through would step twice. */
          const step = wheelStep(event);
          if (handoffBusy(ID)) return;
          if (phase === "playing") {
            event.preventDefault();
            return;
          }
          if (!onStage()) return;
          /* Backstop for the rest invariant. Any gesture that reaches the
             stage takes the page still again — including the tail of a flick
             the gate has already counted, which is what used to scroll the
             page off its rest position after a landing that forgot to stop
             Lenis. Every landing does stop it now; this makes the invariant
             hold even if a future one forgets. */
          getLenis()?.stop();
          if (step === 0) return;
          if (phase === "work" && step > 0) {
            event.preventDefault();
            forward();
          } else if (phase === "cases" && step < 0 && atCasesTop()) {
            event.preventDefault();
            back();
          }
        };

        const onKey = (event: KeyboardEvent) => {
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          const step = keyStep(event);
          if (handoffBusy(ID) || phase === "playing") return;
          if (!onStage()) return;
          getLenis()?.stop();
          if (step === 0) return;
          if (phase === "work" && step > 0) {
            event.preventDefault();
            forward();
          } else if (phase === "cases" && step < 0 && atCasesTop()) {
            event.preventDefault();
            back();
          }
        };

        /* A resize changes both boxes. `measure` re-places the frame at the
           progress it is already at, so this stays correct mid-flight and
           while the study sits landed. */
        const onResize = () => measure();
        /* The real ratio is only known once the file decodes. The declared
           attributes cover the gap, but re-placing on load means a wrong pair
           in the content file can never bake itself into the flight. */
        const onMediaLoad = () => measure();

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
        media.addEventListener("load", onMediaLoad);

        return () => {
          window.clearTimeout(settleId);
          window.removeEventListener("wheel", onWheel);
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("resize", onResize);
          media.removeEventListener("load", onMediaLoad);
          unswallow();
          releaseHandoff(ID);
          tl.kill();
          getLenis()?.start();
          if (network) gsap.set(network, { pointerEvents: "auto" });
        };
      });

      /* --------------------------------------------------------------
       * Touch, narrow windows and reduced motion: nothing travels. Work and
       * the complete case story are ordinary stacked sections, with one
       * screenshot in each chapter (see Cases.module.css).
       * ------------------------------------------------------------ */
      mm.add(STATIC, () => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return;
        }

        const copy = [...studyIn];
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

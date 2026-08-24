"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { getLenis } from "@/components/SmoothScroll";
import {
  DOWN_KEYS,
  UP_KEYS,
  claimHandoff,
  handoffBusy,
  keyStep,
  releaseHandoff,
  wheelStep,
} from "@/components/experience/handoff";
import { FLAGSHIP_CHAPTERS } from "./casesContent";
import styles from "./Cases.module.css";

const CINEMATIC =
  "(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** This section's name in the shared gesture lock. */
const ID = "case-featured";

/** Real seconds one chapter step takes. Shorter than the two section handoffs
 *  (1.9s and 1.5s) because a chapter is a smaller move inside a section that
 *  has already arrived — matching them would make the story drag. */
const CHAPTER_TIME = 1.15;

/* The fold between chapters, in timeline units (one unit per chapter).
   `power2.inOut` matters more than the numbers: a linear translate feels
   mechanical, and a stronger ease feels like it sticks. */
const FOLD_EASE = "power2.inOut";
const FOLD_DUR = 0.82;
/** Slight lift on the panel that is leaving and the one still arriving. Small
 *  on purpose — a `cover` image only crops further, but any more than this
 *  reads as a zoom rather than a fold. */
const FOLD_SCALE = 1.05;

/** The flagship story. Work-to-cases owns the travelling outer frame; this
 * section owns only the chapter copy, screenshot crossfades, and the shared
 * screenshot's opacity once that frame has landed. */
export default function CaseStudies() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = root?.closest<HTMLElement>("[data-experience-stage]");
      const sticky = stage?.querySelector<HTMLElement>(
        "[data-experience-sticky]",
      );
      if (!root || !stage || !sticky) return;

      const chapters = gsap.utils.toArray<HTMLElement>(
        "[data-case-chapter]",
        root,
      );
      const visuals = gsap.utils.toArray<HTMLElement>(
        "[data-case-visual]",
        root,
      );
      const sharedMedia = stage.querySelector<HTMLElement>(
        "[data-flight-media]",
      );
      const mm = gsap.matchMedia();

      mm.add(CINEMATIC, () => {
        /* The visuals are a vertical conveyor, not a crossfade. Each panel
           folds up out of the frame while the next rises into its place from
           below, and both stay fully opaque the whole way: a dissolve reads as
           two pictures blending, where the point here is that one panel
           physically replaces another. The slot's `overflow: hidden` is the
           frame they pass through.

           Slide 0 has to sit at exactly `yPercent: 0, scale: 1`, because the
           travelling Work frame lands on top of it and hands over. */
        gsap.set(visuals, { yPercent: 100, scale: FOLD_SCALE, autoAlpha: 1 });
        gsap.set(visuals[0], { yPercent: 0, scale: 1 });
        gsap.set(chapters, { opacity: 0, y: 46 });
        gsap.set(chapters[0], { opacity: 1, y: 0 });
        if (sharedMedia) gsap.set(sharedMedia, { autoAlpha: 1 });

        /* Paused, not scrubbed. A scrub makes scroll DISTANCE the progress, so
           a hard flick walks several chapters at once and a gentle one crawls.
           Every beat on this stage is stepped instead: one gesture moves
           exactly one chapter, at its own pace, however hard it was thrown.

           Chapter `i` is settled at timeline position `i` exactly, and each
           transition occupies the unit before it. That regularity is what lets
           the stepper below tween the playhead by a constant distance and get
           a constant-speed move every time. */
        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: "power2.inOut" },
        });

        timeline.addLabel("intro", 0);
        if (sharedMedia) {
          /* Release the travelling Work image to the gallery underneath during
             the first step. The slide below it is the identical file at the
             identical framing, so this is invisible. */
          timeline.to(
            sharedMedia,
            { autoAlpha: 0, duration: 0.4, ease: "power1.inOut" },
            0.1,
          );
        }

        for (let index = 1; index < chapters.length; index += 1) {
          const at = index;
          /* The transition runs in the unit before its chapter settles. */
          const from = at - 0.9;
          timeline
            .addLabel(FLAGSHIP_CHAPTERS[index].id, at)
            /* Both panels ride the same curve at the same time, so they read
               as one strip moving rather than two animations that happen to
               overlap. The outgoing one grows very slightly as it leaves,
               which lifts it toward the viewer instead of letting it slide
               flatly off a plane. */
            .to(
              visuals[index - 1],
              {
                yPercent: -100,
                scale: FOLD_SCALE,
                duration: FOLD_DUR,
                ease: FOLD_EASE,
              },
              from,
            )
            .fromTo(
              visuals[index],
              { yPercent: 100, scale: FOLD_SCALE },
              {
                yPercent: 0,
                scale: 1,
                duration: FOLD_DUR,
                ease: FOLD_EASE,
              },
              from,
            )
            /* The copy goes with the panel it belongs to: it starts leaving on
               the same frame and is gone well before the new panel settles, so
               text is never stranded over the wrong image. */
            .to(
              chapters[index - 1],
              { opacity: 0, y: -34, duration: 0.3, ease: "power2.in" },
              from,
            )
            /* The next line lands exactly as the chapter settles. */
            .fromTo(
              chapters[index],
              { opacity: 0, y: 46 },
              { opacity: 1, y: 0, duration: 0.42, ease: "power2.out" },
              at - 0.42,
            );
        }

        /* ---------------- stepping ---------------- */

        const last = chapters.length - 1;
        let chapter = 0;
        let moving = false;

        /** Each chapter rests one viewport further down, the same way Work and
         *  the case landing do. Nothing scrubs across that range; it exists so
         *  every beat owns a scroll position, which keeps the scrollbar honest
         *  and lets a reload land back on the right chapter. */
        const casesTop = () => stage.offsetTop + sticky.offsetHeight;
        const chapterTop = (index: number) =>
          casesTop() + index * sticky.offsetHeight;

        /* Hold the page for the length of the step, exactly as the two section
           handoffs do. Keys are swallowed too — Lenis does not intercept the
           browser's own arrow/page-key scrolling. */
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
        const jumpTo = (y: number) => {
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
        };

        /** Move the playhead one chapter. The playhead tween is deliberately
         *  `ease: "none"` — the fold's own `power2.inOut` is the easing, and
         *  easing the playhead on top of it would double up. */
        const goTo = (next: number) => {
          if (moving || next < 0 || next > last) return;
          if (handoffBusy(ID)) return;
          moving = true;
          claimHandoff(ID);
          hold();
          timeline.tweenTo(next, {
            duration: CHAPTER_TIME,
            ease: "none",
            onComplete: () => {
              chapter = next;
              moving = false;
              jumpTo(chapterTop(next));
              unswallow();
              getLenis()?.stop();
              releaseHandoff(ID);
            },
          });
        };

        /** True when the chapters own the gesture. Below this the Work handoff
         *  and the case landing are still in charge. */
        const onChapters = () => window.scrollY >= casesTop() - 4;

        const act = (step: -1 | 0 | 1, event: Event) => {
          if (step === 0 || moving || handoffBusy(ID)) return;
          if (!onChapters()) return;
          /* At the first chapter an upward gesture belongs to `work-to-cases`,
             which reverses the whole landing. Leave it alone. */
          const next = chapter + step;
          if (next < 0 || next > last) return;
          event.preventDefault();
          goTo(next);
        };

        const onWheel = (event: WheelEvent) => act(wheelStep(event), event);
        const onKey = (event: KeyboardEvent) => {
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          act(keyStep(event), event);
        };

        const settle = () => {
          /* Reloaded part-way through the story: start on that chapter. */
          const index = Math.round(
            (window.scrollY - casesTop()) / sticky.offsetHeight,
          );
          if (index > 0 && index <= last) {
            chapter = index;
            timeline.time(index);
          }
        };
        const settleId = window.setTimeout(settle, 80);

        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("keydown", onKey, { passive: false });

        return () => {
          window.clearTimeout(settleId);
          window.removeEventListener("wheel", onWheel);
          window.removeEventListener("keydown", onKey);
          unswallow();
          releaseHandoff(ID);
          timeline.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="case-studies"
      className={styles.cases}
      aria-label="Case study: Salam Cargo ERP"
      data-cases
    >
      <div className={styles.panel}>
        <div className={styles.visual} data-case-slot aria-hidden="true">
          {FLAGSHIP_CHAPTERS.map((chapter, index) => (
            <div
              key={chapter.id}
              className={styles.visualSlide}
              data-case-visual={chapter.id}
            >
              <Image
                className={styles.visualImage}
                src={chapter.image.src}
                alt=""
                width={chapter.image.width}
                height={chapter.image.height}
                /* The box is 58vw wide and a full viewport tall, so a
                   2800 x 2640 image covering it is painted about
                   `100vh * 2800/2640` wide — more than its own column, which
                   is what the old `60vw` missed by a third and why these read
                   as soft. Stating it in `vh` stays correct as the viewport
                   changes shape; 140 also covers wide, short screens where the
                   58vw column wins instead. */
                sizes="(max-width: 899px) 92vw, 140vh"
                quality={88}
                priority={index === 0}
                /* Eager, because the fold parks these a full viewport below
                   the frame and lazy loading measures the TRANSFORMED box —
                   Chrome quite correctly decides they are off-screen and never
                   starts the fetch, so stepping to a chapter showed an empty
                   panel. The old crossfade never hit this: it left every slide
                   at `inset: 0` and only changed opacity.

                   Only the first is `priority`; the rest load with the page but
                   without a preload hint, so they do not compete with it. */
                loading={index === 0 ? undefined : "eager"}
                style={{ objectPosition: chapter.image.position }}
              />
            </div>
          ))}
        </div>

        <div className={styles.chapters}>
          {FLAGSHIP_CHAPTERS.map((chapter, index) => (
            <article
              key={chapter.id}
              className={`${styles.chapter} ${index === 0 ? styles.intro : ""}`}
              data-case-chapter={chapter.id}
            >
              <div
                className={styles.chapterInner}
                data-cases-in={index === 0 ? "study" : undefined}
              >
                {chapter.label && (
                  <p className={styles.chapterLabel}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.slash}>/</span>
                    {chapter.label}
                  </p>
                )}

                <h2 className={styles.chapterTitle}>{chapter.title}</h2>

                {chapter.body && (
                  <p className={styles.chapterBody}>{chapter.body}</p>
                )}

                {chapter.proof && (
                  <ul className={styles.proof} aria-label="Key points">
                    {chapter.proof.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <figure className={styles.mobileVisual}>
                <Image
                  src={chapter.image.src}
                  alt={chapter.image.alt}
                  width={chapter.image.width}
                  height={chapter.image.height}
                  sizes="(max-width: 899px) 92vw, 80vw"
                  priority={index === 0}
                />
              </figure>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

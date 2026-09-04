"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
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
import { registerStageBeat } from "@/components/experience/stageBeats";
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

/* The chapter change is a mask reveal, measured in timeline units (one unit
   per chapter). The incoming screenshot is uncovered from its top edge
   downward while the one before it stays exactly where it is underneath —
   the picture is not carried into the frame, the frame stops hiding it. */
const MASK_OPEN = "inset(0% 0% 0% 0%)";
const MASK_SHUT = "inset(0% 0% 100% 0%)";
const MASK_EASE = "power2.inOut";
const MASK_DUR = 0.54;

/** The picture keeps easing out of a slight zoom after the mask edge has
 *  passed, which is what stops the reveal reading as a flat wipe. It runs the
 *  whole 0.9 units a step owns, so it is still moving when the mask lands.
 *
 *  Nothing in a step may outlast that 0.9. The playhead is stepped between
 *  whole numbers and parked there, so a tween reaching past `at` would freeze
 *  part-finished until the next gesture. */
const SETTLE_EASE = "power2.out";
const SETTLE_DUR = 0.9;
/** 1.08, not the 1.3 of the reference effect: these are dense UI screenshots
 *  painted `cover` at full viewport height, so anything above 1 is magnifying
 *  the derivative that was actually fetched. Small enough to stay legible,
 *  large enough to feel the settle. */
const IMAGE_ZOOM = 1.08;

/* ------------------------------------------------------------ the copy

   The copy does not arrive as a block. Label, title, body and facts each
   land on their own beat, so the panel assembles in reading order instead
   of appearing all at once — the title is the one that carries the move,
   rising line by line out of its own mask, which is the same gesture the
   screenshot beside it is making.

   Every part is timed against `at`, so each number reads as how long before
   the chapter settles that part starts. Two hard edges bound the window:

     -0.60  the outgoing block has finished leaving, so nothing here may
            start earlier without two chapters' text being on screen at once
      0.00  the playhead parks, so nothing here may finish later or it
            freezes part-done until the next gesture

   `amount` staggers rather than per-element ones on purpose: it spends a
   fixed budget however many lines or facts a chapter turns out to have, so
   a five-line title cannot walk past `at`. */
const COPY_OPENS = -0.6;
const COPY = {
  label: { at: -0.6, dur: 0.3 },
  title: { at: -0.52, dur: 0.38, amount: 0.14 },
  body: { at: -0.36, dur: 0.3 },
  proof: { at: -0.3, dur: 0.22, amount: 0.08 },
};

/** How far below its mask a title line waits, as a share of its own height.
 *  Must clear the descender room the mask adds in `Cases.module.css` —
 *  1.0 plus that padding — or the top of the line shows before it moves. */
const LINE_RISE = 120;

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
        /* The visuals are a stack, not a conveyor. Every panel sits in the
           slot the whole time and is uncovered in place by its own mask,
           which opens from the top edge down over the panel before it.
           Nothing slides, so the picture being read never moves out from
           under the reader, and the incoming one arrives already at its
           final framing instead of travelling into it.

           The mask is an `inset()` clip-path on the slide itself; the slot's
           `overflow: hidden` is still the outer frame.

           Slide 0 has to sit fully open at image scale 1, because the
           travelling Work frame lands on top of it and hands over. */
        gsap.set(visuals, { clipPath: MASK_SHUT, autoAlpha: 1 });
        gsap.set(visuals[0], { clipPath: MASK_OPEN });
        /* The article is a gate now, not a mover: the parts inside it carry
           the entrance, so this only decides whether a chapter is on screen.
           Plain `opacity` and not `autoAlpha`, because all five chapters
           stay in the accessibility tree in document order. */
        gsap.set(chapters, { opacity: 0, y: 0 });
        gsap.set(chapters[0], { opacity: 1 });
        if (sharedMedia) gsap.set(sharedMedia, { autoAlpha: 1 });

        /* Split every chapter title into masked lines, once, up front.
           `mask: "lines"` wraps each line in its own `overflow: clip` box,
           which is what lets a line rise out of nothing instead of fading in
           place. `aria: "auto"` is the default and matters here: it copies
           the heading's text onto its own `aria-label` and hides the pieces,
           so a screen reader still reads one sentence, not a stack of lines.

           Chapter 0 is deliberately left whole. Its entrance belongs to
           `work-to-cases`, which animates `[data-cases-in="study"]` — the
           wrapper this timeline must not touch. */
        const splits: SplitText[] = [];
        const titleLines = (chapter: HTMLElement) => {
          const title = chapter.querySelector<HTMLElement>(
            '[data-chapter-part="title"]',
          );
          if (!title) return [];
          const split = SplitText.create(title, {
            type: "lines",
            mask: "lines",
            linesClass: "caseTitleLine",
          });
          splits.push(split);
          return split.lines as HTMLElement[];
        };

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
          /* Release the travelling Work image to the gallery underneath. The
             slide below it is the identical file at the identical framing, so
             this is invisible; the dissolve exists only to soften the frames
             2px overscan rather than cut it away.

             It has to be finished before the first mask moves. This used to
             run 0.1 -> 0.5, straight through the first reveal, which the fold
             got away with because the outgoing panel was sliding out of the
             slot anyway. A mask uncovers the new picture *in place*, so a
             still-visible shared image sits on top of it as a ghost of the
             old one -- measured at 0.21 opacity with the mask half open.
             Owning exactly the dead 0.1 units before the first transition
             keeps the two apart by construction. */
          timeline.to(
            sharedMedia,
            { autoAlpha: 0, duration: 0.1, ease: "power1.inOut" },
            0,
          );
        }

        for (let index = 1; index < chapters.length; index += 1) {
          const at = index;
          /* The transition runs in the unit before its chapter settles. */
          const from = at - 0.9;
          const image = visuals[index].querySelector("img");

          timeline
            .addLabel(FLAGSHIP_CHAPTERS[index].id, at)
            /* The mask edge sweeps the full height of the slot. The panel
               underneath is never touched — it is simply covered, which is
               the whole point: one picture is drawn over another, rather
               than two pictures both moving. */
            .fromTo(
              visuals[index],
              { clipPath: MASK_SHUT },
              { clipPath: MASK_OPEN, duration: MASK_DUR, ease: MASK_EASE },
              from,
            );

          if (image) {
            /* Starts with the mask and outlasts it, so the picture is still
               easing back to its true size for a moment after the edge has
               gone past. */
            timeline.fromTo(
              image,
              { scale: IMAGE_ZOOM },
              { scale: 1, duration: SETTLE_DUR, ease: SETTLE_EASE },
              from,
            );
          }

          const label = chapters[index].querySelector(
            '[data-chapter-part="label"]',
          );
          const lines = titleLines(chapters[index]);
          const body = chapters[index].querySelector('[data-chapter-part="body"]');
          const facts = chapters[index].querySelectorAll(
            '[data-chapter-part="proof"]',
          );

          timeline
            /* The copy goes with the panel it belongs to: it starts leaving on
               the same frame and is gone well before the new panel settles, so
               text is never stranded over the wrong image. The exit stays on
               the article as one block — a staggered exit would compete with
               the staggered entrance answering it half a second later, and
               this is the half nobody is reading. */
            .to(
              chapters[index - 1],
              { opacity: 0, y: -34, duration: 0.3, ease: "power2.in" },
              from,
            )
            /* Ungate the incoming article the instant that exit finishes. It
               carries no motion of its own; everything inside it is still
               parked at its from-state, so there is nothing to see yet. */
            .set(chapters[index], { opacity: 1 }, at + COPY_OPENS)

            /* The label wipes in from the left rather than fading. It is one
               short mono line, and a wipe on it rhymes with the mask opening
               on the screenshot instead of arguing with it. */
            .fromTo(
              label,
              { clipPath: "inset(0% 100% 0% 0%)", opacity: 0 },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                opacity: 1,
                duration: COPY.label.dur,
                ease: "power2.out",
              },
              at + COPY.label.at,
            )

            /* The move. Each line rises out of its own clip box, one just
               behind the last, so the sentence builds top to bottom in the
               same direction the picture is being uncovered. No fade: a line
               emerging from a hard edge is what makes it read as type being
               set rather than text switching on. */
            .fromTo(
              lines,
              { yPercent: LINE_RISE },
              {
                yPercent: 0,
                duration: COPY.title.dur,
                ease: "power3.out",
                stagger: { amount: COPY.title.amount },
              },
              at + COPY.title.at,
            )

            /* Body and facts follow the title rather than racing it. */
            .fromTo(
              body,
              { opacity: 0, y: 22 },
              {
                opacity: 1,
                y: 0,
                duration: COPY.body.dur,
                ease: "power2.out",
              },
              at + COPY.body.at,
            )
            /* The facts are the only place with any overshoot, and it is small
               — they are pills, so a touch of spring reads as them settling
               into place. Anything more would look like a toy. */
            .fromTo(
              facts,
              { opacity: 0, y: 14, scale: 0.96 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: COPY.proof.dur,
                ease: "back.out(1.5)",
                stagger: { amount: COPY.proof.amount },
              },
              at + COPY.proof.at,
            )
            /* Once the new panel covers it completely, drop the one below out
               of the paint. Nothing slides off-frame any more, so without
               this every chapter already passed stays stacked behind the
               current one, and the last chapter paints five full-viewport
               screenshots in the same box. It reverses on its own: GSAP
               restores the recorded value as the playhead crosses back, one
               step ahead of the mask above it reopening. */
            .set(visuals[index - 1], { autoAlpha: 0 }, at);
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

        /* The closing hook owns the next two stage beats and the final release.
           This section stops at its result chapter and lets that shared parent
           handle a downward gesture from there. */
        const lastTop = () => chapterTop(last);

        /** True when the chapters own the gesture. Below this the Work handoff
         *  and the case landing are still in charge; past the last chapter the
         *  closing sections are. */
        const onChapters = () =>
          window.scrollY >= casesTop() - 4 && window.scrollY <= lastTop() + 4;

        const act = (step: -1 | 0 | 1, event: Event) => {
          if (moving || handoffBusy(ID)) return;
          if (!onChapters()) return;
          /* Same backstop as `work-to-cases`: any gesture landing on the
             chapter range keeps the page still, so nothing can drift off a
             chapter's rest position and break the ±4px guards. */
          getLenis()?.stop();
          if (step === 0) return;
          const next = chapter + step;
          /* The parent closing transition owns this seam. Do not prevent the
             event; its listener reads the same memoised gesture. */
          if (next > last) {
            return;
          }
          /* At the first chapter an upward gesture belongs to `work-to-cases`,
             which reverses the whole landing. Leave it alone. */
          if (next < 0) return;
          event.preventDefault();
          goTo(next);
        };

        const onWheel = (event: WheelEvent) => act(wheelStep(event), event);
        const onKey = (event: KeyboardEvent) => {
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          act(keyStep(event), event);
        };

        const settle = () => {
          if (window.scrollY > lastTop() + 4) {
            /* Ending/Contact deep loads still need the result chapter behind
               their curtains so reversing reaches the correct case state. */
            chapter = last;
            timeline.time(last);
            return;
          }
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

        /* See `stageBeats.ts` — this is what the footer unwinds first. */
        const unregister = registerStageBeat(ID, {
          order: 0,
          reset: () => {
            timeline.pause(0);
            chapter = 0;
            moving = false;
          },
          settle,
        });

        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("keydown", onKey, { passive: false });

        return () => {
          window.clearTimeout(settleId);
          unregister();
          window.removeEventListener("wheel", onWheel);
          window.removeEventListener("keydown", onKey);
          unswallow();
          releaseHandoff(ID);
          /* Kill first, revert second: `revert()` puts the original heading
             markup back, so any tween still pointing at a line element has to
             be gone before those elements are. */
          timeline.kill();
          splits.forEach((split) => split.revert());
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
                  <p className={styles.chapterLabel} data-chapter-part="label">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.slash}>/</span>
                    {chapter.label}
                  </p>
                )}

                <h2 className={styles.chapterTitle} data-chapter-part="title">
                  {chapter.title}
                </h2>

                {chapter.body && (
                  <p className={styles.chapterBody} data-chapter-part="body">
                    {chapter.body}
                  </p>
                )}

                {chapter.proof && (
                  <ul className={styles.proof} aria-label="Key points">
                    {chapter.proof.map((item) => (
                      <li key={item} data-chapter-part="proof">
                        {item}
                      </li>
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

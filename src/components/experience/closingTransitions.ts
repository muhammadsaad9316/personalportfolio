"use client";

import type { RefObject } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { getLenis } from "@/components/SmoothScroll";
import {
  claimHandoff,
  completeHandoff,
  handoffBusy,
  isHandoffKey,
  keyStep,
  releaseHandoff,
  wheelStep,
} from "./handoff";
import {
  registerStageBeat,
  setStageReleased,
  stageReleased,
  stageTravelling,
} from "./stageBeats";

const ID = "closing-sequence";
const CINEMATIC =
  "(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const STATIC =
  "(max-width: 899px), (prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)";

type ClosingRefs = {
  rootRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  stickyRef: RefObject<HTMLDivElement | null>;
};

/**
 * The two requested curtain moves: case result → Ending → Contact.
 *
 * The reference's nested outer/inner reveal and 15% surface parallax are kept;
 * its looping Observer is not. This page already has a gesture gate and one
 * scroll owner, so these become two more reversible beats in that same system.
 */
export function useClosingTransitions({
  rootRef,
  stageRef,
  stickyRef,
}: ClosingRefs) {
  useGSAP(
    () => {
      const stage = stageRef.current;
      const sticky = stickyRef.current;
      if (!stage || !sticky) return;

      const casePanel = stage.querySelector<HTMLElement>("[data-closing-case]");
      const ending = stage.querySelector<HTMLElement>(
        '[data-closing-panel="ending"]',
      );
      const contact = stage.querySelector<HTMLElement>(
        '[data-closing-panel="contact"]',
      );
      const chapters = stage.querySelectorAll<HTMLElement>(
        "[data-case-chapter]",
      );
      if (!casePanel || !ending || !contact || !chapters.length) return;

      const mm = gsap.matchMedia();

      mm.add(CINEMATIC, () => {
        const endingOuter = ending.querySelector<HTMLElement>(
          "[data-closing-outer]",
        );
        const endingInner = ending.querySelector<HTMLElement>(
          "[data-closing-inner]",
        );
        const endingSurface = ending.querySelector<HTMLElement>(
          "[data-closing-surface]",
        );
        const contactOuter = contact.querySelector<HTMLElement>(
          "[data-closing-outer]",
        );
        const contactInner = contact.querySelector<HTMLElement>(
          "[data-closing-inner]",
        );
        const contactSurface = contact.querySelector<HTMLElement>(
          "[data-closing-surface]",
        );
        const endingHeading = ending.querySelector<HTMLElement>(
          "[data-closing-heading]",
        );
        const contactHeading = contact.querySelector<HTMLElement>(
          "[data-closing-heading]",
        );
        if (
          !endingOuter ||
          !endingInner ||
          !endingSurface ||
          !contactOuter ||
          !contactInner ||
          !contactSurface ||
          !endingHeading ||
          !contactHeading
        ) {
          return;
        }

        const endingSplit = SplitText.create(endingHeading, {
          type: "chars",
          mask: "chars",
          charsClass: "closingChar",
        });
        const contactSplit = SplitText.create(contactHeading, {
          type: "chars",
          mask: "chars",
          charsClass: "closingChar",
        });
        const endingChars = endingSplit.chars as HTMLElement[];
        const contactChars = contactSplit.chars as HTMLElement[];
        const endingCopy = gsap.utils.toArray<HTMLElement>(
          "[data-closing-copy]",
          ending,
        );
        const contactCopy = gsap.utils.toArray<HTMLElement>(
          "[data-closing-copy]",
          contact,
        );

        const armIncoming = (
          outer: HTMLElement,
          inner: HTMLElement,
          surface: HTMLElement,
          chars: HTMLElement[],
          copy: HTMLElement[],
        ) => {
          gsap.set(outer, { yPercent: 100 });
          gsap.set(inner, { yPercent: -100 });
          gsap.set(surface, { yPercent: 15 });
          gsap.set(chars, { autoAlpha: 1, yPercent: 135 });
          gsap.set(copy, { autoAlpha: 0, y: 26 });
        };

        armIncoming(
          endingOuter,
          endingInner,
          endingSurface,
          endingChars,
          endingCopy,
        );
        armIncoming(
          contactOuter,
          contactInner,
          contactSurface,
          contactChars,
          contactCopy,
        );

        const transition = (
          outgoing: HTMLElement,
          outer: HTMLElement,
          inner: HTMLElement,
          surface: HTMLElement,
          chars: HTMLElement[],
          copy: HTMLElement[],
        ) => {
          const [kicker, ...support] = copy;
          const tl = gsap
            .timeline({ paused: true })
            .to(
              outgoing,
              { yPercent: -15, duration: 0.94, ease: "power3.inOut" },
              0,
            )
            .to(
              [outer, inner, surface],
              { yPercent: 0, duration: 0.94, ease: "power3.inOut" },
              0,
            );

          if (kicker) {
            tl.to(
              kicker,
              { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" },
              0.52,
            );
          }

          tl.to(
            chars,
            {
              yPercent: 0,
              duration: 0.46,
              ease: "power3.out",
              stagger: { amount: 0.18, from: "start" },
            },
            0.58,
          );

          if (support.length) {
            tl.to(
              support,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.34,
                ease: "power2.out",
                stagger: { amount: 0.12, from: "start" },
              },
              0.76,
            );
          }

          return tl;
        };

        const endingTl = transition(
          casePanel,
          endingOuter,
          endingInner,
          endingSurface,
          endingChars,
          endingCopy,
        );
        const contactTl = transition(
          endingSurface,
          contactOuter,
          contactInner,
          contactSurface,
          contactChars,
          contactCopy,
        );

        const panels = [casePanel, ending, contact];
        const motionTargets = [
          casePanel,
          endingOuter,
          endingInner,
          endingSurface,
          contactOuter,
          contactInner,
          contactSurface,
        ];
        let current = 0;
        let moving = false;
        let releaseTimer = 0;
        let releaseGeneration = 0;
        let releasing = false;
        let hurriedRelease = false;
        let reentryUntil = 0;
        let moveTween: gsap.core.Tween | null = null;

        const top = (index: number) =>
          stage.offsetTop + (chapters.length + index) * sticky.offsetHeight;
        const afterTop = () =>
          document.querySelector<HTMLElement>("[data-after-stage]")
            ?.offsetTop ?? stage.offsetTop + stage.offsetHeight;

        const jumpTo = (y: number) => {
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
        };

        const setPanel = (panel: HTMLElement, active: boolean) => {
          panel.inert = !active;
          if (active) panel.removeAttribute("aria-hidden");
          else panel.setAttribute("aria-hidden", "true");
          gsap.set(panel, { autoAlpha: active ? 1 : 0 });
        };

        const setState = (next: number) => {
          current = next;
          panels.forEach((panel, index) => setPanel(panel, index === next));
        };

        const seek = (next: number) => {
          endingTl.pause(next >= 1 ? endingTl.duration() : 0);
          contactTl.pause(next >= 2 ? contactTl.duration() : 0);
          setState(next);
        };

        const swallow = (event: Event) => {
          if (!(event instanceof WheelEvent && event.ctrlKey)) event.preventDefault();
        };
        const swallowKeys = (event: KeyboardEvent) => {
          if (isHandoffKey(event)) {
            event.preventDefault();
          }
        };
        const hold = () => {
          getLenis()?.stop();
          window.addEventListener("wheel", swallow, { passive: false });
          window.addEventListener("touchmove", swallow, { passive: false });
          window.addEventListener("keydown", swallowKeys, { passive: false });
        };
        const releaseHold = () => {
          window.removeEventListener("wheel", swallow);
          window.removeEventListener("touchmove", swallow);
          window.removeEventListener("keydown", swallowKeys);
        };

        const reveal = (index: number) => setPanel(panels[index], true);

        const finishMove = (next: number, focusIncoming: boolean) => {
          current = next;
          jumpTo(top(next));
          setState(next);
          releaseHold();
          getLenis()?.stop();
          motionTargets.forEach((target) =>
            target.style.removeProperty("will-change"),
          );
          moving = false;
          moveTween = null;
          completeHandoff(ID);

          if (focusIncoming) {
            const target =
              next === 0
                ? casePanel
                : panels[next].querySelector<HTMLElement>(
                    "[data-closing-heading]",
                  );
            target?.focus({ preventScroll: true });
          }
        };

        const goTo = (next: number, keyboard: boolean) => {
          if (moving || next < 0 || next > 2 || handoffBusy(ID)) return;
          moving = true;
          claimHandoff(ID);
          hold();
          reveal(next);
          motionTargets.forEach((target) => {
            target.style.willChange = "transform";
          });

          const focusIncoming =
            keyboard &&
            panels[current].contains(document.activeElement as Node | null);
          const tl = current === 0 || next === 0 ? endingTl : contactTl;
          moveTween = tl.tweenTo(next > current ? tl.duration() : 0, {
            ease: "none",
            onComplete: () => finishMove(next, focusIncoming),
          });
        };

        const finishRelease = (generation: number) => {
          if (generation !== releaseGeneration || !releasing) return;
          releaseTimer = 0;
          releasing = false;
          releaseHold();
          moving = false;
          getLenis()?.start();
          completeHandoff(ID);
        };

        const glideToFooter = (duration: number) => {
          const generation = ++releaseGeneration;
          window.clearTimeout(releaseTimer);
          releaseTimer = 0;
          const lenis = getLenis();
          if (lenis) {
            lenis.scrollTo(afterTop(), {
              duration,
              force: true,
              onComplete: () => {
                if (generation !== releaseGeneration || !releasing) return;
                releaseTimer = window.setTimeout(
                  () => finishRelease(generation), hurriedRelease ? 60 : 520,
                );
              },
            });
          } else {
            window.scrollTo({ top: afterTop(), behavior: "smooth" });
            releaseTimer = window.setTimeout(() => finishRelease(generation), 1200);
          }
        };

        const leaveStage = () => {
          if (moving || handoffBusy(ID)) return;
          moving = true;
          releasing = true;
          hurriedRelease = false;
          claimHandoff(ID);
          hold();
          setStageReleased(true);
          glideToFooter(1.1);
        };

        const hurry = (speed = 3) => {
          if (!moving) return;
          if (!releasing) {
            if (moveTween) moveTween.timeScale(Math.max(moveTween.timeScale(), speed));
            return;
          }
          if (hurriedRelease) return;
          hurriedRelease = true;
          if (releaseTimer) {
            window.clearTimeout(releaseTimer);
            const generation = releaseGeneration;
            releaseTimer = window.setTimeout(() => finishRelease(generation), 60);
          } else if (getLenis()) glideToFooter(1.1 / speed);
        };

        const onClosing = () =>
          window.scrollY >= top(0) - 4 && window.scrollY <= top(2) + 4;

        const step = (direction: -1 | 1, keyboard: boolean) => {
          if (moving || handoffBusy(ID)) return false;
          if (stageReleased()) {
            if (direction > 0 || window.scrollY < top(2)) return false;
            claimHandoff(ID);
            setStageReleased(false);
            reentryUntil = 0;
            seek(2);
            getLenis()?.stop();
            jumpTo(top(2));
            completeHandoff(ID);
            return true;
          }
          if (!onClosing()) return false;
          const next = current + direction;
          if (next < 0) return false;
          if (next > 2) leaveStage();
          else goTo(next, keyboard);
          return true;
        };

        const act = (
          step: -1 | 0 | 1,
          event: WheelEvent | KeyboardEvent,
        ) => {
          if (moving || handoffBusy(ID) || stageReleased() || !onClosing()) {
            return;
          }
          getLenis()?.stop();
          if (performance.now() < reentryUntil) {
            event.preventDefault();
            return;
          }
          if (step === 0) {
            if (event instanceof KeyboardEvent) event.preventDefault();
            return;
          }

          const next = current + step;
          if (next < 0) return; // the final case chapter owns this direction
          event.preventDefault();
          if (next > 2) leaveStage();
          else goTo(next, event instanceof KeyboardEvent);
        };

        const onWheel = (event: WheelEvent) => act(wheelStep(event), event);
        const onKey = (event: KeyboardEvent) => {
          if (!isHandoffKey(event)) return;
          act(keyStep(event), event);
        };

        const onScroll = () => {
          if (stageTravelling()) return;
          if (stageReleased()) {
            if (window.scrollY <= top(2) - 8) {
              // A scrollbar reversal can cancel the footer glide before its completion callback.
              window.clearTimeout(releaseTimer);
              releaseTimer = 0;
              releaseGeneration++;
              releasing = false;
              hurriedRelease = false;
              releaseHold();
              moving = false;
              releaseHandoff(ID);
              setStageReleased(false);
              reentryUntil = performance.now() + 700;
              seek(2);
              getLenis()?.stop();
              jumpTo(top(2));
            }
            return;
          }
          if (window.scrollY > top(2) + 4) {
            seek(2);
            setStageReleased(true);
            getLenis()?.start();
          }
        };

        const settle = () => {
          const y = window.scrollY;
          if (y > top(2) + 4) {
            seek(2);
            setStageReleased(true);
            getLenis()?.start();
            return;
          }
          setStageReleased(false);
          if (y >= top(2) - sticky.offsetHeight / 2) {
            seek(2);
            jumpTo(top(2));
            getLenis()?.stop();
            return;
          }
          if (y >= top(1) - sticky.offsetHeight / 2) {
            seek(1);
            jumpTo(top(1));
            getLenis()?.stop();
            return;
          }
          seek(0);
          if (y >= top(0) - 4) {
            jumpTo(top(0));
            getLenis()?.stop();
          }
        };

        seek(0);
        const settleId = window.setTimeout(settle, 120);
        const unregister = registerStageBeat(ID, {
          order: 3,
          reset: () => {
            window.clearTimeout(releaseTimer);
            releaseTimer = 0;
            releaseGeneration++;
            releasing = false;
            hurriedRelease = false;
            moveTween?.kill();
            moveTween = null;
            moving = false;
            reentryUntil = 0;
            releaseHold();
            releaseHandoff(ID);
            seek(0);
          },
          settle,
          input: { step, hurry },
        });

        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("keydown", onKey, { passive: false });
        window.addEventListener("scroll", onScroll, { passive: true });

        return () => {
          window.clearTimeout(settleId);
          window.clearTimeout(releaseTimer);
          releaseGeneration++;
          releasing = false;
          unregister();
          window.removeEventListener("wheel", onWheel);
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("scroll", onScroll);
          releaseHold();
          moveTween?.kill();
          endingTl.kill();
          contactTl.kill();
          endingSplit.revert();
          contactSplit.revert();
          panels.forEach((panel) => {
            panel.inert = false;
            panel.removeAttribute("aria-hidden");
          });
          releaseHandoff(ID);
        };
      });

      mm.add(STATIC, () => {
        [casePanel, ending, contact].forEach((panel) => {
          panel.inert = false;
          panel.removeAttribute("aria-hidden");
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );
}

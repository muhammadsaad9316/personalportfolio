"use client";

/**
 * What the gesture-driven sections have to agree on.
 *
 * Hero → Work, Work → Case Studies and the five case-study chapters are all
 * discrete beats: one gesture moves exactly one beat, whether it was a flick
 * or a nudge. Each beat's motion stays in its own file — this module animates
 * nothing. It only decides *when* a gesture counts, and makes sure two beats
 * can never run at once.
 *
 * Two separate problems live here, and they need different mechanisms:
 *
 *   1. One flick is many events. A trackpad emits a wheel event every ~10ms
 *      for the whole length of a swipe and keeps going through the momentum
 *      tail. Left alone, a single hard flick walks the whole page.
 *   2. One beat is running. Anything else that reacts mid-move animates the
 *      same section twice.
 */

/* ------------------------------------------------------------------ lock */

let owner: string | null = null;

/** Take the page. Called the moment a beat starts playing. */
export function claimHandoff(id: string) {
  owner = id;
}

/**
 * Give it back, and start the settle window.
 *
 * Every beat brackets itself with claim/release, so this is also the honest
 * moment to say "a move just finished" — which is what stops the tail of the
 * gesture that caused it from immediately causing another.
 */
export function releaseHandoff(id: string) {
  if (owner === id) {
    owner = null;
    readyAt = now() + SETTLE_MS;
  }
}

/** True while another beat is mid-move and this one must not react. */
export function handoffBusy(id: string) {
  return owner !== null && owner !== id;
}

/* -------------------------------------------------------------- gestures */

/**
 * Wheel events closer together than this belong to the same flick.
 *
 * Deliberately short. It only has to span the gap *inside* a trackpad burst
 * (~10ms) — not the gap between mouse-wheel notches, which is 50ms and up. A
 * long value here would collapse steady wheel-rolling into a single gesture
 * and leave mouse users unable to advance at all; the settle window below is
 * what handles them.
 */
const BURST_GAP_MS = 50;

/**
 * Quiet required after a beat lands before another can start.
 *
 * This is the half that catches a steadily rolling mouse wheel: its notches
 * are far enough apart to each look like a new gesture, so without a settle
 * window a continuous roll would step every notch.
 */
const SETTLE_MS = 140;

const now = () =>
  typeof performance === "undefined" ? Date.now() : performance.now();

let lastWheelAt = -Infinity;
let readyAt = 0;
let judged: WheelEvent | null = null;
let verdict: -1 | 0 | 1 = 0;

/**
 * The step this wheel event asks for: `1` down, `-1` up, `0` for "part of a
 * flick that has already been counted — ignore".
 *
 * Memoised on the event object, so every section that asks about the same
 * event gets the same answer no matter which listener happens to run first.
 *
 * Call it BEFORE bailing out for any other reason. The burst timer only stays
 * honest if it sees the events that arrive mid-move too — those are exactly
 * the ones that must not be allowed to queue up another step.
 */
export function wheelStep(event: WheelEvent): -1 | 0 | 1 {
  if (event === judged) return verdict;
  judged = event;

  const at = event.timeStamp || now();
  const fresh = at - lastWheelAt >= BURST_GAP_MS;
  lastWheelAt = at;

  verdict =
    fresh && at >= readyAt && event.deltaY !== 0
      ? event.deltaY > 0
        ? 1
        : -1
      : 0;
  return verdict;
}

/** The same rule for the keyboard. Auto-repeat is one gesture, not many. */
export function keyStep(event: KeyboardEvent): -1 | 0 | 1 {
  if (event.repeat || now() < readyAt) return 0;
  if (DOWN_KEYS.has(event.key)) return 1;
  if (UP_KEYS.has(event.key)) return -1;
  return 0;
}

/** Keys that mean "move down" / "move up". */
export const DOWN_KEYS = new Set([
  "ArrowDown",
  "PageDown",
  "End",
  " ",
  "Spacebar",
]);
export const UP_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);

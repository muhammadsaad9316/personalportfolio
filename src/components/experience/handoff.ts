"use client";

/**
 * The two things `hero-to-work` and `work-to-cases` have to agree on.
 *
 * Both handoffs are gesture driven: each listens to the window for a wheel
 * notch or a key, holds the page still, and plays its own timeline. They sit
 * back to back on the same scroll — Work is the landing of the first and the
 * start of the second — so while one is playing, the other must stay out of
 * it. Without this, an upward flick during the Work exit also fires the Hero
 * return, and a downward flick during the Hero's dolly also launches the Work
 * exit: two timelines animating the same section at once.
 *
 * They never run concurrently by design, so one module-level owner is enough.
 * This is deliberately not a store or an event bus — it is the single fact the
 * two files share, and nothing else belongs here.
 */

let owner: string | null = null;

/** Take the page. Called the moment a handoff starts playing. */
export function claimHandoff(id: string) {
  owner = id;
}

/** Give it back. Safe to call when someone else holds it, or nobody does. */
export function releaseHandoff(id: string) {
  if (owner === id) owner = null;
}

/** True while another handoff is mid-move and this one must not react. */
export function handoffBusy(id: string) {
  return owner !== null && owner !== id;
}

/** Keys that mean "move down" / "move up". Shared so both handoffs read the
 *  same gesture from the keyboard as they do from the wheel. */
export const DOWN_KEYS = new Set([
  "ArrowDown",
  "PageDown",
  "End",
  " ",
  "Spacebar",
]);
export const UP_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);

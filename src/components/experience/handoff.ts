"use client";

/**
 * What the gesture-driven sections have to agree on.
 *
 * Hero → Work, Work → Case Studies and the three case-study chapters are
 * discrete beats. One wheel gesture requests one beat. A deliberate wheel
 * repeat can hurry that move, but cannot queue another forward beat. Explicit
 * keys and direction reversals may retain one request for the next safe seam.
 * Each beat's motion stays in its own file — this module animates nothing.
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

export type HandoffInput = {
  step: (direction: -1 | 1, keyboard: boolean) => boolean;
  hurry: (speed?: number) => void;
};

const inputs = new Map<string, HandoffInput>();
let pending: { direction: -1 | 1; keyboard: boolean } | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let handoffDirection = 0;

function clearPending() {
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = null;
  pending = null;
}

export function registerHandoffInput(id: string, input: HandoffInput) {
  inputs.set(id, input);
  return () => {
    if (inputs.get(id) !== input) return;
    inputs.delete(id);
    clearPending();
    releaseHandoff(id);
  };
}

/** Dispatch only after the prior owner has parked its scroll and released input. */
function schedulePending(delay = 60) {
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    if (owner !== null || !pending) return;
    const intent = pending;
    pending = null;
    readyAt = 0;
    handoffDirection = intent.direction;
    for (const input of inputs.values()) {
      if (input.step(intent.direction, intent.keyboard)) {
        hurryHandoff(intent.keyboard ? 3 : 1.8);
        break;
      }
    }
  }, delay);
}

/** Direct navigation cancels old requests before rebuilding the stage. */
export function resetHandoff() {
  clearPending();
  owner = null;
  readyAt = 0;
  handoffDirection = 0;
}

/** Owners retime their existing animation; this module never writes visual values. */
export function hurryHandoff(speed = 3) {
  if (owner !== null) inputs.get(owner)?.hurry(speed);
  else inputs.forEach(input => input.hurry(speed));
}

/** Take the page. Called the moment a beat starts playing. */
export function claimHandoff(id: string) {
  owner = id;
}

/**
 * Cancel this owner and its pending request, then start the settle window.
 *
 * Reset, navigation and teardown use this path. They must not dispatch an
 * earlier request into the state that is replacing the cancelled move.
 */
export function releaseHandoff(id: string) {
  if (owner === id) {
    owner = null;
    clearPending();
    readyAt = now() + SETTLE_MS;
  }
}

/** Successful completion may deliver one deliberate follow-up at the settled seam. */
export function completeHandoff(id: string) {
  if (owner !== id) return;
  owner = null;
  readyAt = now() + SETTLE_MS;
  if (pending) schedulePending();
}

/** True while another beat is mid-move and this one must not react. */
export function handoffBusy(id: string) {
  return owner !== null && owner !== id;
}

/* -------------------------------------------------------------- gestures */

/**
 * Wheel momentum can pause between packets. Require a real quiet interval,
 * and reject decaying packets across longer gaps before accepting a restart.
 */
const BURST_GAP_MS = 240;
const WHEEL_IDLE_MS = 700;

/**
 * Quiet required after a beat lands before another can start.
 *
 * A deliberate fresh request during this window is remembered rather than
 * dropped; momentum from the same flick is still rejected by the burst gate.
 */
const SETTLE_MS = 140;

const now = () =>
  typeof performance === "undefined" ? Date.now() : performance.now();

let lastWheelAt = -Infinity;
let lastWheelDirection = 0;
let lastWheelMagnitude = 0;
let readyAt = 0;
let judged: WheelEvent | null = null;
let verdict: -1 | 0 | 1 = 0;
let judgedKey: KeyboardEvent | null = null;
let keyVerdict: -1 | 0 | 1 = 0;

function acceptIntent(direction: -1 | 1, keyboard: boolean, at: number): -1 | 0 | 1 {
  if (owner !== null || pending !== null || at < readyAt) {
    if (!keyboard && (handoffDirection === 0 || direction === handoffDirection)) {
      if (pending && !pending.keyboard) clearPending();
      if (owner !== null) hurryHandoff(1.8);
      return 0;
    }
    pending = { direction, keyboard };
    if (owner !== null) hurryHandoff(keyboard ? 3 : 1.8);
    else schedulePending(Math.max(0, Math.min(60, readyAt - at)));
    return 0;
  }
  handoffDirection = direction;
  return direction;
}

/**
 * The step this wheel event asks for: `1` down, `-1` up, `0` for momentum
 * already counted or an intent retained for the busy owner's next safe seam.
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
  const direction = Math.sign(event.deltaY);
  const magnitude = Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 800 : 1);
  const gap = at - lastWheelAt;
  const reversed = direction !== lastWheelDirection &&
    (event.deltaMode > 0 || magnitude >= 24);
  const decaying = direction === lastWheelDirection && magnitude < lastWheelMagnitude * 0.9;
  const changedDirection = lastWheelDirection !== 0 && direction !== lastWheelDirection;
  const fresh = reversed || (gap >= BURST_GAP_MS &&
    (gap >= WHEEL_IDLE_MS || (!changedDirection && !decaying)));
  lastWheelAt = at;
  if (direction === lastWheelDirection || fresh) lastWheelMagnitude = magnitude;

  verdict = 0;
  if (fresh && direction !== 0 && !event.ctrlKey) {
    lastWheelDirection = direction;
    verdict = acceptIntent(direction > 0 ? 1 : -1, false, at);
    if (verdict === 0) event.preventDefault();
  }
  return verdict;
}

export function isHandoffKey(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (!DOWN_KEYS.has(event.key) && !UP_KEYS.has(event.key)) return false;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return false;
  if ((event.key === " " || event.key === "Spacebar") &&
      target?.closest?.('button, a, [role="button"]')) return false;
  return true;
}

/** The same rule for the keyboard. Auto-repeat is one gesture, not many. */
export function keyStep(event: KeyboardEvent): -1 | 0 | 1 {
  if (event === judgedKey) return keyVerdict;
  judgedKey = event;
  keyVerdict = 0;
  if (!isHandoffKey(event)) return 0;
  if (event.repeat) {
    if (owner !== null) event.preventDefault();
    return 0;
  }
  const backwards = UP_KEYS.has(event.key) ||
    (event.shiftKey && (event.key === " " || event.key === "Spacebar"));
  keyVerdict = acceptIntent(backwards ? -1 : 1, true, now());
  if (keyVerdict === 0) event.preventDefault();
  return keyVerdict;
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

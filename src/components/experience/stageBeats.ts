"use client";

/**
 * The register the stage's beats agree on, so something below them can put the
 * whole story back to a known state.
 *
 * `hero-to-work`, `work-to-cases` and `case-featured` each keep their phase and
 * their paused timeline in a closure, and none of them knows the others exist.
 * That was fine while the story was the whole page. It stops being fine the
 * moment there is content underneath it, because the footer's "Back to top"
 * has to return a page whose three timelines are all sitting at the end.
 *
 * Each beat registers two functions it already had:
 *
 *   reset   put this beat back to time zero
 *   settle  configure this beat for wherever `scrollY` currently is — the
 *           same thing each one already does on reload
 *
 * Like `handoff.ts`, this module animates nothing and decides nothing. It is a
 * list, kept in one place so the order is explicit.
 *
 * Why a reset can be instant: by the time the footer is on screen the entire
 * stage has scrolled off above the viewport, so unwinding five chapters, a
 * flight and a hero transformation is not visible. The glide home afterwards
 * travels a page that is already back in its opening state.
 */

type Beat = {
  /** Lowest first. The innermost beat has to unwind before the one holding it. */
  order: number;
  reset: () => void;
  settle: () => void;
};

const beats = new Map<string, Beat>();

export function registerStageBeat(id: string, beat: Beat) {
  beats.set(id, beat);
  return () => {
    if (beats.get(id) === beat) beats.delete(id);
  };
}

/* ------------------------------------------------------------ released */

/**
 * True once the story has handed the page back to ordinary scrolling.
 *
 * This exists because of one assumption that used to be safe. `work-to-cases`
 * stops Lenis on *any* gesture reaching the stage, as a backstop for the rest
 * invariant in `doc/WORK_TO_CASES.md` §10 — sound while the stage was the whole
 * page, and wrong the moment there is somewhere to go. Without this flag that
 * backstop re-stops Lenis on every event of the very flick that is trying to
 * leave, and the exit glide never moves.
 *
 * `case-featured` owns the value; the backstops only read it.
 */
let released = false;

export function setStageReleased(next: boolean) {
  released = next;
}

export function stageReleased() {
  return released;
}

/**
 * True while something is deliberately moving the page across the stage
 * boundary — the footer gliding home, or a footer link rebuilding the stage at
 * a beat.
 *
 * The boundary watcher in `case-featured` exists to catch the page arriving
 * below the story by accident, and it cannot tell that apart from a journey
 * that is meant to pass straight through. Without this it grabbed the
 * "Back to top" glide on its way past the last chapter and parked it there
 * instead of at the hero.
 */
let travelling = false;

export function setStageTravelling(next: boolean) {
  travelling = next;
}

export function stageTravelling() {
  return travelling;
}

/** Innermost first: case chapters, then the flight, then the hero. */
const inOrder = () => [...beats.values()].sort((a, b) => a.order - b.order);

/**
 * True only when the cinematic stage is actually armed. Touch, narrow windows
 * and reduced motion register nothing, because there is no lock to unwind —
 * the page is ordinary document flow and the browser can just scroll.
 */
export function stageIsArmed() {
  return beats.size > 0;
}

export function resetStage() {
  released = false;
  travelling = false;
  inOrder().forEach((beat) => beat.reset());
}

/** Re-derive every beat's state from the current scroll position. */
export function settleStage() {
  inOrder().forEach((beat) => beat.settle());
}

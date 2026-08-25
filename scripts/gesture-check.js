/**
 * Gesture regression check for the Hero → Work → Case Studies stage.
 *
 * Not a test framework and not a dependency: one file, pasted into the
 * DevTools console on a running dev server, at a desktop viewport (≥ 900px
 * wide, fine pointer, normal motion). It drives real wheel events and asserts
 * against measured layout.
 *
 * It runs in two passes because one of the four checks needs a reload:
 *
 *   1. paste it   → runs the first three checks, then reloads the page
 *   2. paste it again → finishes the reload check and prints the summary
 *
 * Covers exactly four things, all of which have broken at least once:
 *
 *   1. One flick equals one step. A hard flick emits events for well over a
 *      second; every one of them past the first must be ignored.
 *   2. Rest positions are exact, and the last one is the page bottom.
 *   3. Reversing returns the Salam Cargo frame to its Work card, to the pixel.
 *   4. Reloading part-way through the story restores that chapter.
 */
(async () => {
  const KEY = "gesture-check";
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass, detail });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const round = (n) => Math.round(n * 100) / 100;

  const stage = document.querySelector("[data-experience-stage]");
  const sticky = document.querySelector("[data-experience-sticky]");
  if (!stage || !sticky) return "stage not found — is this the portfolio page?";

  const cinematic = matchMedia(
    "(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  ).matches;
  if (!cinematic) {
    return `not the cinematic layout (viewport ${innerWidth}px) — widen the window and reload`;
  }
  if (document.visibilityState !== "visible") {
    return "page is hidden, so requestAnimationFrame is stopped and no GSAP timeline can advance — show the page and rerun";
  }

  /** The seven beats: hero, work, case intro, then one per remaining chapter. */
  const vh = () => sticky.offsetHeight;
  const rests = () => {
    const top = stage.offsetTop;
    const chapters = document.querySelectorAll("[data-case-chapter]").length;
    return [0, top, ...Array.from({ length: chapters }, (_, i) => top + (i + 1) * vh())];
  };

  const frameRect = () => {
    const el = document.querySelector("[data-flight-frame]");
    const b = el.getBoundingClientRect();
    return [round(b.x), round(b.y), round(b.width), round(b.height)];
  };

  /** One hard flick: events for 1.5s, the way a trackpad actually behaves. */
  const flick = (dir) => {
    for (let i = 0; i < 150; i += 1) {
      setTimeout(() => {
        window.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: dir * 100,
            cancelable: true,
            bubbles: true,
          }),
        );
      }, i * 10);
    }
  };

  /** Wait until the scroll has been still for a while, or give up. */
  const settled = async (budget = 6000) => {
    let last = -1;
    let still = 0;
    for (let t = 0; t < budget; t += 100) {
      await wait(100);
      if (Math.round(scrollY) === last) still += 100;
      else {
        still = 0;
        last = Math.round(scrollY);
      }
      if (still >= 700) return;
    }
  };

  const step = async (dir) => {
    flick(dir);
    await wait(1600); // let the flick finish emitting before judging stillness
    await settled();
  };

  /* ------------------------------------------------------------ pass two */

  const pending = sessionStorage.getItem(KEY);
  if (pending) {
    sessionStorage.removeItem(KEY);
    const { expectIndex, expectScroll } = JSON.parse(pending);
    await wait(1500); // settle() runs on a timeout after mount

    const chapters = [...document.querySelectorAll("[data-case-chapter]")];
    const slides = [...document.querySelectorAll("[data-case-visual]")];
    const ty = (el) => {
      const m = getComputedStyle(el).transform.match(/matrix\(([^)]*)\)/);
      return m ? +m[1].split(",")[5] : 0;
    };
    const shown = chapters.findIndex((c) => +getComputedStyle(c).opacity > 0.5);

    ok(
      "4. reload restores the chapter",
      shown === expectIndex &&
        Math.abs(ty(slides[expectIndex])) < 2 &&
        Math.abs(scrollY - expectScroll) < 4,
      `scrollY ${Math.round(scrollY)} (want ${expectScroll}), visible chapter ${shown} (want ${expectIndex}), its slide ty ${round(ty(slides[expectIndex]))}`,
    );

    const prior = JSON.parse(sessionStorage.getItem(KEY + ":earlier") || "[]");
    sessionStorage.removeItem(KEY + ":earlier");
    const all = [...prior, ...results];
    console.table(all.map((r) => ({ check: r.name, result: r.pass ? "PASS" : "FAIL", detail: r.detail })));
    return all.every((r) => r.pass) ? "ALL PASS" : "FAILURES ABOVE";
  }

  /* ------------------------------------------------------------ pass one */

  if (Math.round(scrollY) !== 0) {
    scrollTo(0, 0);
    await wait(400);
    return "scroll was not at the top; reset it — rerun now";
  }

  const map = rests();
  ok(
    "2. rest positions exact",
    map[map.length - 1] === document.documentElement.scrollHeight - innerHeight,
    `rests ${map.join(", ")}; last vs max scroll ${document.documentElement.scrollHeight - innerHeight}`,
  );

  await step(1); // hero → work
  const atWork = Math.round(scrollY);
  const cardFrame = frameRect();
  ok("1. one flick = one step (hero → work)", atWork === map[1], `scrollY ${atWork}, want ${map[1]}`);

  await step(1); // work → case intro
  const atCases = Math.round(scrollY);
  ok("1b. one flick = one step (work → cases)", atCases === map[2], `scrollY ${atCases}, want ${map[2]}`);

  await step(-1); // back to work
  const back = Math.round(scrollY);
  const backFrame = frameRect();
  ok(
    "3. reverse returns the frame to its card",
    back === map[1] && backFrame.every((v, i) => Math.abs(v - cardFrame[i]) < 1),
    `scrollY ${back}; frame ${backFrame.join(", ")} vs ${cardFrame.join(", ")}`,
  );

  console.table(results.map((r) => ({ check: r.name, result: r.pass ? "PASS" : "FAIL", detail: r.detail })));

  // Park on a chapter and reload, for check 4.
  const expectIndex = 2; // "approach"
  const expectScroll = map[2 + expectIndex];
  sessionStorage.setItem(KEY + ":earlier", JSON.stringify(results));
  sessionStorage.setItem(KEY, JSON.stringify({ expectIndex, expectScroll }));
  scrollTo(0, expectScroll);
  await wait(300);
  location.reload();
  return "pass one done — reloading; paste this script again to finish check 4";
})();

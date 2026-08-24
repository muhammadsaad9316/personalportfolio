# Work → Case Studies

Implementation record for the `work-to-cases` transition and the Case Studies
section it lands on.

Read `doc/moresimple.md` for what the move is supposed to feel like and
`doc/MOTION_ARCHITECTURE.md` for who owns what. This file records how the
approved behaviour was actually built, the numbers it runs on, and what was
measured.

---

## 1. What it does

One downward gesture out of Work — a wheel notch, a trackpad flick, Page Down
— plays the whole move at its own eased pace while the page is held still,
exactly the way `hero-to-work` does. It is not scrubbed: the amount you scroll
does not change how far the move gets, and it cannot be dragged frame by frame
or left stalled half way.

1. The three secondary project previews fade and shrink slightly.
2. The connecting lines dissolve.
3. The centre impact circle shrinks.
4. **Digital products. Real impact.** lifts upward and fades.
5. **CASE STUDIES / A closer look at the thinking behind the work.** arrives on
   the right.
6. The Salam Cargo preview travels out of its Work card and grows into the
   full-width, full-height visual on the left of the first case study.
7. **Salam Cargo ERP** and its case-study copy rise in on the right, after the
   visual has settled.

One upward gesture reverses the identical timeline and returns the preview to
its exact position in the Work card. A second upward gesture at Work hands
back to the Hero, so the whole page is one gesture per section in both
directions.

### The one rule the whole design serves

The preview is never copied, swapped or crossfaded. The element that flies is
the Work card's own `.projectFrame` — the same DOM node, the same `<img>`,
moved. The case study's full-bleed left side is an **empty measured slot** that the
frame lands on. That is what makes it read as one continuous object instead of
two pictures dissolving into each other.

---

## 2. Files

### New

| File | Job |
| --- | --- |
| `src/components/experience/Experience.tsx` | The shared wrapper. Holds Hero, Work and Case Studies, and calls one hook per transition. Owns no motion itself. |
| `src/components/experience/workToCases.ts` | The `work-to-cases` timeline and its gesture handling. |
| `src/components/experience/handoff.ts` | The one flag `hero-to-work` and `work-to-cases` share, plus the key sets both read. |
| `src/components/cases/CaseStudies.tsx` | Case Studies structure and content. |
| `src/components/cases/Cases.module.css` | Case Studies layout and static styling. |
| `src/components/cases/casesContent.ts` | Case Studies copy and image data. |
| `public/media/work/salam-cargo.webp` | The shipped visual. 1500 × 958, 68 KB. |
| `media/salam-cargo-dashboard.png` | The untouched source screenshot. |

### Renamed

`src/components/experience/HeroWorkExperience.tsx` →
`src/components/experience/heroToWork.ts`

The component became the `useHeroToWork()` hook. Its timeline logic is
unchanged — same beats, same constants, same gesture handling. Only the
signature changed: it now takes refs instead of owning them, and `workEl` is
the stage rather than a plain Work wrapper. The JSX moved to `Experience.tsx`.

### Changed

| File | Change |
| --- | --- |
| `src/components/experience/Experience.module.css` | Added `.stage` / `.stageSticky`. |
| `src/components/work/Work.tsx` | Added the `[data-cases-out]` layers, the flagship card structure, and `clearActive` on the handle. |
| `src/components/work/Work.module.css` | Styles for the new layers; `.work` is now transparent and `z-index: 2`. |
| `src/components/work/workContent.ts` | `image` became an object; added `imageAlt` and `flagship`. |
| `src/components/work/ProjectPreview.tsx` | Reads the new image object. |
| `src/app/page.tsx` | Renders `<Experience />`. |
| `doc/MOTION_ARCHITECTURE.md` | Ownership row updated to match what was built. |

---

## 3. The stage

Work and the first case study are two children of **one sticky,
viewport-height grid cell**. Both sit in `grid-area: 1 / 1`, so they occupy the
same space and the frame can travel from one layout to the other without ever
leaving the document.

```tsx
<div ref={stageRef} className={styles.stage}>
  <div ref={stickyRef} className={styles.stageSticky}>
    <Work ref={work} />
    <CaseStudies />
  </div>
</div>
```

```css
.stage {
  position: relative;
  z-index: 1;                 /* below .heroScene; own stacking context */
  background: var(--work-cream);
}

@media (cinematic) {
  .stage        { height: 200svh; }
  .stageSticky  { position: sticky; top: 0; height: 100svh;
                  overflow: hidden; display: grid;
                  grid-template-columns: 100%; grid-template-rows: 100%; }
  .stageSticky > * { grid-area: 1 / 1; min-width: 0; }
}
```

### Why sticky and not ScrollTrigger `pin`

`position: sticky` needs no pin-spacer, so `stage.offsetTop` stays stable —
which matters because `hero-to-work` jumps the scroll to exactly that value.
It also reverses for free. `body { overflow-x: hidden }` was a concern; it does
not break sticky here, because with `html` at `overflow: visible` the body's
value propagates to the viewport and the body itself stays a non-scroller.
Verified in the browser: `position: sticky`, height 900 at a 900px viewport.

### Scroll map

The stage is **two rest positions, not a scrub track**. Nothing is scroll
linked, so the range between them carries no animation at all — it exists only
to give the landed study a scroll position of its own, so the page can carry on
below it later. Every position inside that range renders the same stuck frame,
which is what makes the jump at the end of the move invisible.

At a 1440 × 900 viewport:

| Range | scrollY | State |
| --- | --- | --- |
| Hero | 0 | Held until a gesture; `hero-to-work` jumps to the stage top |
| Work at rest | 900 | Held until a gesture; timeline at progress 0 |
| The move | 900 | Plays in place. The scroll does not move until it lands |
| Study at rest | 1800 | Jumped to on completion; timeline at progress 1 |
| Document end | 1800 (max scroll) | Sticky releases exactly at the page bottom — no dead space |

`200svh` = 100 (Work) + 100 (the study's own rest position). The second figure
is one viewport by construction: `casesTop` is computed as
`stage.offsetTop + stage.offsetHeight - sticky.offsetHeight`, the last position
the sticky is stuck at, so the two never drift apart the way the old
`CASES_SCROLL` constant and this height could. Changing this height moves where
the study rests; it does **not** change the move's pace, which is `FORWARD_TIME`.

### Stacking

Inside the stage's own stacking context:

```
.stage (z-index 1, below .heroScene at 2)
  └─ .work   z-index 2      ← the travelling frame lives in here
  └─ .cases  z-index 1
```

Work paints **above** the case panel. That is deliberate: mid-flight the frame
crosses the horizontal band the case-study text occupies, and it has to pass
over that column, not under it. Once landed they no longer overlap. `.work` was
made `background: transparent` so the case panel is visible through it — the
cream ground moved to `.stage` and `.experience`, both reading the same
`--work-cream` token the Hero handoff depends on.

---

## 4. Layer ownership

Work's entrance already owned `autoAlpha` and `y` on its cards, heading and
SVGs. The transition needs the same visual result on the same boxes. Sharing
the property would violate the property boundary in
`doc/MOTION_ARCHITECTURE.md`, so the transition animates **wrapper layers**
instead:

```
li[data-project]              Work entrance / exit   (y, autoAlpha)
 └─ .projectMotion            hover + focus state    (scale, autoAlpha)
     └─ .projectOut           work-to-cases          (scale, y, autoAlpha)
         └─ a.projectLink
             ├─ .projectMeta       [data-cases-out="cardText"]  (flagship only)
             ├─ .projectFrame      [data-flight-frame]          (flagship only)
             └─ .projectSummary    [data-cases-out="cardText"]  (flagship only)
```

The same trick wraps the Work heading (`.introOut`) and each network SVG
(`.svgLayer`). Full hook list:

| Selector | Element | Animated |
| --- | --- | --- |
| `[data-cases-out="card"]` | the three secondary cards | `autoAlpha`, `scale`, `y` |
| `[data-cases-out="cardText"]` | flagship card's text only | `autoAlpha`, `y` |
| `[data-cases-out="intro"]` | Work heading block | `autoAlpha`, `y` |
| `[data-cases-out="wires"]` | connector SVG layer | `autoAlpha` |
| `[data-cases-out="centre"]` | impact circle SVG layer | `autoAlpha`, `scale` |
| `[data-flight-frame]` | flagship `.projectFrame` | `x`, `y`, `scaleX`, `scaleY`, border radius, shadow |
| `[data-flight-frame] img` | the shared Salam Cargo image | counter `scaleX`, `scaleY` to preserve its ratio |
| `[data-cases-in="title"]` | section eyebrow + h2 | `autoAlpha`, `y` |
| `[data-cases-in="study"]` | study num, name, kind, intro | `autoAlpha`, `y` |
| `[data-case-slot]` | landing target | nothing — measured only |

The flagship keeps its `.projectOut` untouched, because fading that layer would
take the picture with it. Only its text leaves.

---

## 5. The flight

### Geometry

The destination is a different aspect ratio from the Work card. The outer
frame therefore maps to the slot on both axes, while the image inside receives
the inverse counter-scale needed to stay undistorted and crop like `cover`:

```
scaleX = (slot.width + 4px overscan) / frame.layoutWidth
scaleY = (slot.height + 4px overscan) / frame.layoutHeight
x      = slot.offset.x - frame.offset.x - 2px
y      = slot.offset.y - frame.offset.y - 2px

cover       = max(scaleX, scaleY)
mediaScaleX = cover / scaleX
mediaScaleY = cover / scaleY
```

The 2px overlap on each edge prevents sub-pixel seams. On the desktop cinematic
path, the flagship's Work border is drawn as an inset shadow rather than a
layout border, so removing the card treatment cannot change the image geometry.

### Position and size measurement

`offsetLeft`/`offsetTop` still provide the untransformed position inside the
sticky container. Size uses the live bounding box divided by the currently
applied scale, retaining sub-pixel dimensions when measuring mid-flight or
after a resize.

```ts
function offsetWithin(el, root) {
  let x = 0, y = 0, node = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return { x, y };
}
```

Both the frame and the slot terminate their `offsetParent` chain at
`.stageSticky`, which is an offset parent because `position: sticky` is a
positioned value.

### Why a proxy object drives it

The frame is moved by a tween on `{ t: 0 }` whose `onUpdate` calls `apply()`,
rather than by tweening `x`/`y`/`scale` directly:

```ts
const flight = { x: 0, y: 0, scale: 1 };   // measured
const travel = { t: 0 };                   // progress

const apply = () => gsap.set(frame, {
  x: flight.x * travel.t,
  y: flight.y * travel.t,
  scale: 1 + (flight.scale - 1) * travel.t,
});
```

The destination is therefore resolved on **every frame** from live measurements,
never baked in at build time. `measure()` runs before each play, before each
reverse, and on `resize`, and finishes by calling `apply()` itself — a
measurement that does not move the playhead (resizing while the study is
landed) would otherwise leave the old distance on screen. That exact bug was
found and fixed during the scrubbed version's verification; the `apply()` call
is what keeps it fixed, and it is still verified at three widths in §9.

This also matches the existing `dolly()` helper in `heroToWork.ts`, so both
transitions drive geometry the same way.

---

## 6. The timeline

One **paused** timeline, played forward and reversed. Not two builds: the
return has to retrace this exact path for the frame to land back in its card to
the pixel, which a separately authored reverse cannot guarantee.

Timeline units stay abstract and total 1.115. `timeScale` maps them onto real
seconds — `FORWARD_TIME = 1.9`, `BACK_TIME = 1.5` — so re-timing one beat never
changes the overall pace, and changing the pace never disturbs the
choreography. 1.9s is `hero-to-work`'s length, so the two handoffs read as the
same gesture rather than two different mechanisms.

The beat table below is unchanged from the scrubbed version; only the drive is
different. The "% of scroll" column is now "% of the move".

| Beat | Targets | At | Ends | % of the move | Values |
| --- | --- | --- | --- | --- | --- |
| 1 Secondary previews out | `card` ×3 | 0.00 | 0.36 | 0–32% | `autoAlpha 0`, `scale .94`, `y 18`, stagger .05 |
| Flagship card text out | `cardText` ×2 | 0.06 | 0.28 | 5–25% | `autoAlpha 0`, `y -12` |
| 2 Lines dissolve | `wires` | 0.10 | 0.32 | 9–29% | `autoAlpha 0` |
| 4 Heading lifts | `intro` | 0.14 | 0.40 | 13–36% | `autoAlpha 0`, `y -44` |
| 3 Circle shrinks | `centre` | 0.16 | 0.42 | 14–38% | `autoAlpha 0`, `scale .72` |
| 5 Section title in | `title` ×2 | 0.38 | 0.68 | 34–61% | `autoAlpha 1`, `y 0`, stagger .06 |
| 6 **The flight** | `frame` | 0.42 | 0.82 | 38–74% | `power1.inOut` |
| 7 Study copy in | `study` ×4 | 0.80 | 1.115 | 72–100% | `autoAlpha 1`, `y 0`, stagger .045 |

Default ease `power2.inOut`; the flight uses `power1.inOut` so a long diagonal
travel does not read as mechanical.

The documented order is respected — the section title (5) starts before the
flight (6) — but beats deliberately overlap. Strictly sequential beats would
make the move twice as long and read as a checklist.

### Gesture handling

The state machine is three values — `work`, `playing`, `cases` — and the same
`hold()` / `jumpTo()` pair `heroToWork.ts` uses. A downward wheel or
`DOWN_KEYS` at `work` plays forward; an upward wheel or `UP_KEYS` at `cases`
reverses. `hold()` stops Lenis and swallows wheel, touchmove and keydown for
the duration, and the scroll is parked on the landing rest position in
`onComplete` / `onReverseComplete`.

Two guards matter:

- **`onStage()`** — `scrollY >= workTop() - 4`. Without it, the downward flick
  that launches the Hero's dolly would launch this move as well.
- **`handoffBusy(ID)`** — `hero-to-work` keeps the scroll at `workTop` while it
  plays, and this move keeps it there for its whole flight, so `atWorkTop()` is
  true during both. Either handoff would otherwise fire inside the other's
  move. See `handoff.ts`.

Because `hero-to-work` restarts Lenis when it lands, and this stage has no
free-scrolling region of its own, `onWheel` and `onKey` call `getLenis()?.stop()`
before deciding. The one notch Lenis has already consumed cannot show anything:
every scroll position on the stage renders the same stuck frame.

### Pointer handling

The moment Work starts leaving, `[data-network]` gets `pointer-events: none`
and `work.current.clearActive()` releases any hovered or focused card, so
nothing is left scaled or dimmed underneath the departing composition. Both are
set as the move starts and revert on `onReverseComplete`, so hover belongs to
Work exactly while Work is the section on screen. `clearActive` was added to
`WorkHandle` for this; it is
React state, so it lives on the imperative handle directly rather than in the
timeline half (`api.current`, now typed
`Pick<WorkHandle, "enter" | "exit" | "reset">`).

---

## 7. Modes

Two `gsap.matchMedia()` conditions, the same pair `heroToWork.ts` uses.

**Cinematic** — `(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`

Everything above.

**Static** — `(max-width: 899px), (prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)`

- `.stage` is `height: auto`, `.stageSticky` is a plain block. Work and Case
  Studies are two ordinary stacked sections in document order.
- Nothing travels. The frame keeps no transform.
- The slot renders its **own** copy of the image — CSS decides, not JS.
- Reduced motion: the branch returns immediately, so every element sits at its
  natural CSS state. No scrub, no pin, no parallax.
- Touch and narrow windows (not reduced motion): one short `cases-intro`
  reveal, `start: "top 72%"`, `once: true`.

### The slot image in cinematic mode

The slot's `<img>` is not `display: none` on the cinematic path — it is
`opacity: 0`. That keeps its descriptive `alt` in the accessibility tree while
the travelling frame supplies the visible picture. The Work card's copy carries
`alt=""`, because the card's own text already names it.

The slot's border, background and shadow are also cleared on the cinematic
path, so the empty landing target is invisible; the frame brings its own.

---

## 8. The image

Source: a full-page screenshot of the Salam Cargo ERP company overview,
1920 × 1933.

Cropped to the top 1920 × 1226 band and resized to **1500 × 958**, WebP q82,
**68 KB**. The crop keeps the header, the five-KPI row, the warehouse queue
counts and the whole branch comparison table — the part that still reads as a
real product at 354px card width — and drops the sparse lower charts.

`sizes` is `(max-width: 899px) 92vw, 52vw`, chosen for the **landed** size, not
the card size. The card shows it at ~354px, but the same element is scaled to
~723px by the transition, and a transform does not make the browser fetch a
larger source.

One file serves both places. `workContent.ts` and `casesContent.ts` both point
at `/media/work/salam-cargo.webp`.

---

## 9. Verified

Measured in Playwright at 1440 × 900 unless noted.

| Check | Result |
| --- | --- |
| One gesture forward | a single wheel notch at Work plays the whole move; `scrollY` stays 900 for the entire flight and lands at 1800 |
| Full-bleed landing | slot `(0, 0, 826.30×900)`; frame `(-2.10, -2.91, 830.31×904)` — every edge covered, with no seam |
| Reverse | one upward notch returns the frame to `matrix(1, 0, 0, 1, 0, 0)` — its exact card position |
| Reverse state | Work heading, cards, wires and circle all back to `visible / 1`; case copy back to `hidden / 0`; `[data-network]` `pointer-events: auto` |
| Cross-handoff guard | two upward flicks fired mid-reverse: hero stayed `hidden / 0`, `scrollY` stayed 1800, the lock stayed with `work-to-cases` |
| Keyboard | PageDown plays forward, PageUp reverses, both landing on the same rest positions as the wheel |
| Full round trip | hero → work → cases → work → hero → work → cases → work; every rest state returns the lock to `null` |
| Resize while landed | at 1180 × 800 the slot is `(0, 0, 675.5×800)` and the frame covers it at `(-1.73, -2.47)` through `(677.75, 801.12)` |
| Page end | `casesTop` = max scroll at both 1440 × 900 (1800) and 1180 × 860 (1720) — no gap after the study |
| Mobile 375 × 812 | stacked, sticky `relative`, stage height auto, frame `transform: none`, slot image `opacity 1`, `cases-intro` reveal fires |
| Reduced motion | CSS gate read from the CSSOM: `.stage { height: 200svh }` applies **only** under `(prefers-reduced-motion: no-preference)`, so the stage stays `auto` as before. The JS branch is unchanged from the scrubbed version and still returns early. Not re-run under live emulation — the browser harness has no reduced-motion toggle |
| Production build | passes; `/` at 21.7 kB, 183 kB First Load JS |

### Two GSAP behaviours worth remembering

**Staggered `fromTo` only arms its first target.** The incoming case-study copy
was originally a `fromTo` with a stagger. Only element `[0]` of each group got
the from-state written; everything after it sat visible until the playhead
reached its slice. A staggered tween writes each target's start values when that
target's own slice begins, not at build time. Fixed by arming with an explicit
`gsap.set()` and using plain `.to()` for the reveal.

**A refresh that does not move the playhead does not re-render.** Resizing while
the study was landed left the frame at the previous viewport's travel distance
(38px off at 1180px wide) — `measure()` had run and updated `flight`, but the
timeline's progress was still 1, so the tween never re-rendered and never
applied the new numbers. Fixed by having `measure()` call `apply()` itself.

---

## 10. Known rough edge

Lenis momentum can carry the scroll a few hundred pixels **above** the stage top
without a further wheel event, which leaves the viewport in the hero's region
while the hero is still hidden — a blank cream screen until the next upward
gesture fires `back()`. This is pre-existing `hero-to-work` behaviour, not
introduced here (`atWorkTop()` only fires on a wheel event, and momentum
arrives without one). Observed at `scrollY 540`. Worth tightening when
`hero-to-work` is next revisited.

Moving to a gesture drive should reduce it — `work-to-cases` now calls
`getLenis()?.stop()` on every wheel that reaches the stage, which kills
momentum at Work's rest position rather than letting it coast. That was a
side effect, not the goal, and it has not been measured, so treat the rough
edge as still open.

---

## 11. Tuning

| Want | Change |
| --- | --- |
| Slower / faster move | `FORWARD_TIME` in `workToCases.ts` (currently `1.9s`) |
| Slower / faster return | `BACK_TIME` (currently `1.5s`) |
| Where the landed study rests on the scroll | `.stage` height in `Experience.module.css`. Nothing else reads it — `casesTop` is derived from layout |
| Reorder or re-time beats | the position parameters in the timeline table above |
| Different flight path feel | the flight tween's `ease` (currently `power1.inOut`) |
| Bigger / smaller landed visual | `.panel` grid columns in `Cases.module.css` — the flight measures whatever the slot ends up being |
| A different flagship | `flagship: true` in `workContent.ts` plus a real `image` on that project |

---

## 12. Not built yet

- **`case-featured`** — the flagship's pinned chapter scroll
  (intro → problem → approach → solution → result, ~300–400vh). It owns the
  *inner* visual layer only; `work-to-cases` alone owns the outer frame's move
  between section layouts. The study's rest position — `casesTop`, the far end
  of the stage — is the seam it should start from. That is also where `rest()`
  should stop holding the page still and start Lenis again, since the study
  will no longer be the last thing on the page.
- **Case studies 02–04** — Time Mardan, Danx Detailing, Miru Closet, as the
  short shared entrance pattern. Copy is in `doc/simpleenglish.md`.
- **Case-study ending, contact, footer.**
- The Work cards link to `/work/<slug>` routes that do not exist yet.

### Case-study split

The approved layout now places the visual full-bleed on the **left** and the
story on the right. `doc/moresimple.md` records the same direction.

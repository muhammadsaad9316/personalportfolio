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
5. The Salam Cargo preview travels out of its Work card and grows into the
   full-width, full-height visual on the left of the first case study.
6. **Salam Cargo ERP** rises in on the right after the visual settles, with one
   line of context and three facts.

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
| `src/components/experience/handoff.ts` | The gesture gate every beat shares: it collapses a flick into one step, enforces a settle window, and holds the one-owner lock. Animates nothing. |
| `src/components/cases/CaseStudies.tsx` | Case Studies structure and content. |
| `src/components/cases/Cases.module.css` | Case Studies layout and static styling. |
| `src/components/cases/casesContent.ts` | Case Studies copy and image data. |
| `public/media/screenshotofSalamCargoo/*.png` | Five supplied 2800 × 2640 product screenshots used by the shared preview and featured chapters. Near-square on purpose — see §8. |

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
  .stage        { height: 600svh; }
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

The stage is **seven rest positions, not a scrub track**. Work rests at the
stage top, the case landing one viewport later, and each remaining chapter one
viewport after that. Nothing on this stage is scroll-linked.

At a 1440 × 900 viewport:

| Beat | scrollY | State |
| --- | --- | --- |
| Hero | 0 | Held until a gesture; `hero-to-work` jumps to the stage top |
| Work | 900 | Held until a gesture; timeline at progress 0 |
| *(any move)* | unchanged | Plays in place. The scroll only jumps once the move has landed |
| Case intro | 1800 | **Salam Cargo ERP**, its line of context and three facts |
| The problem | 2700 | |
| The approach | 3600 | |
| The solution | 4500 | |
| The result | 5400 (max scroll) | Sticky releases exactly here — no dead space |

`600svh` = six beats of one viewport each. Nothing scrubs across that range —
every beat is stepped by gesture — so it exists only to give each beat a scroll
position of its own, which keeps the scrollbar honest and lets a reload land
back on the right chapter. `casesTop` is `stage.offsetTop + sticky.offsetHeight`
and chapter *i* rests at `casesTop + i * sticky.offsetHeight`, so the last
chapter falls exactly on max scroll.

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
| `[data-flight-media]` | the shared Salam Cargo image | `scaleX`, `scaleY` to cover the frame's live box at its own ratio, plus `object-fit`; `case-featured` later owns opacity only |
| `[data-cases-in="study"]` | the landing title's inner wrapper | `autoAlpha`, `y` |
| `[data-cases]` | the whole case panel | `autoAlpha` — hidden until the move is nearly over |
| `[data-case-slot]` | the full-bleed visual container | `autoAlpha` — measured, and hidden until the frame covers it |

The flagship keeps its `.projectOut` untouched, because fading that layer would
take the picture with it. Only its text leaves.

### Why the panel has to be hidden, not just empty

The case panel shares Work's grid cell and `.work` is transparent, so anything
painted in the panel shows straight through the Work section. `case-featured`
arms its first chapter *visible*, which is right once the study has landed and
wrong while Work is on screen — it put the 826 × 900 flagship screenshot behind
the project network, over the Work heading.

`case-featured` owns `[data-case-visual]` and `[data-case-chapter]`, so this
handoff must not touch them. It owns the two containers instead — the panel and
the visual slot — which is the wrapper-layer rule in
`doc/MOTION_ARCHITECTURE.md` applied to a section rather than a card.

The two reveals are timed apart on purpose:

| At | Target | Why there |
| --- | --- | --- |
| 0.78 | `[data-cases]` | Just before the copy at 0.80. The panel's ground is the same `--work-cream` the stage is painted in, so nothing changes on screen |
| 0.82 | `[data-case-slot]` | The exact frame the flight lands, when the travelling frame covers the slot with its 2px overscan and carries the identical image. Any earlier and the full-size screenshot shows around the still-arriving frame |

Both are zero-duration `set`s inside the timeline, so the reverse restores them
and the panel is hidden again the moment Work is back.

`autoAlpha` and not `display`: the slot must keep its layout box, because the
flight measures it.

---

## 5. The flight

### Geometry

The destination is a different aspect ratio from the Work card, and so is the
image. The outer frame maps to the slot on both axes, while the image inside is
scaled to cover the frame's **current** box using its own ratio:

```
scaleX = (slot.width + 4px overscan) / frame.layoutWidth
scaleY = (slot.height + 4px overscan) / frame.layoutHeight
x      = slot.offset.x - frame.offset.x - 2px
y      = slot.offset.y - frame.offset.y - 2px

-- every frame, from the live box rather than two stored endpoints --
boxW        = frame.offsetWidth  * currentScaleX
boxH        = frame.offsetHeight * currentScaleY
coverW      = max(boxW, boxH * imageRatio)
mediaScaleX = coverW / boxW
mediaScaleY = coverW / imageRatio / boxH
```

`imageRatio` comes from `naturalWidth / naturalHeight`, falling back to the
declared attributes until the file decodes, with a `load` listener that
re-measures. Note that `naturalWidth` is density-corrected for a
srcset-selected source — a 2560px file can report 1260 — but that scales both
axes equally, so the *ratio* is still true.

### Why not `max(scaleX, scaleY)`

The earlier form was `cover = max(scaleX, scaleY)`, then `cover / scaleX` and
`cover / scaleY`. That is only equivalent while **the Work card frame happens
to share the image's aspect ratio**, which it did for as long as
`.previewImage` was `height: auto`.

That invariant is gone. The card is now pinned to the inline-SVG preview box
(`aspect-ratio: 360 / 230`) so a real screenshot cannot set the card's height,
while the supplied screenshots are near-square (2800 × 2640) because that is
what suits the full-bleed slot. With a 354 × 226 card frame the old form lands
the image at **1416 × 904** where the chapter slide underneath paints it at
955 × 900 — a 48% jump on the crossfade. The live-box form lands it at
959.6 × 904, which is the slide's framing plus the 2px overscan on each side.

Because the image is covered by transform rather than by `object-fit`, GSAP
sets `object-fit: fill` on the cinematic path — `cover` would crop a second
time, inside a box that is the wrong shape for most of the flight. The CSS
keeps `object-fit: cover` as the base, which is what the static path and the
pre-hydration frame use.

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

Timeline units stay abstract and total 0.98. `timeScale` maps them onto real
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
| 5 **The flight** | `frame` | 0.42 | 0.82 | 43–84% | two-axis cover mapping, `power1.inOut` |
| 6 Project title in | `study` ×1 | 0.80 | 0.98 | 82–100% | `autoAlpha 1`, `y 0` |

Default ease `power2.inOut`; the flight uses `power1.inOut` so a long diagonal
travel does not read as mechanical.

The beats deliberately overlap. Strictly sequential beats would make the move
twice as long and read as a checklist.

### Gesture handling

The state machine is three values — `work`, `playing`, `cases` — and the same
`hold()` / `jumpTo()` pair `heroToWork.ts` uses. A downward wheel or
`DOWN_KEYS` at `work` plays forward. An upward wheel or `UP_KEYS` reverses only
after the visitor returns to `casesTop`; deeper in the story it remains normal
reverse chapter scrolling. `hold()` stops Lenis and swallows wheel, touchmove,
and keydown for the handoff itself.

Three guards matter:

- **`onStage()`** — `scrollY >= workTop() - 4`. Without it, the downward flick
  that launches the Hero's dolly would launch this move as well.
- **`atCasesTop()`** — prevents an upward gesture inside the featured chapters
  from reversing the outer Work handoff early.
- **`handoffBusy(ID)`** — `hero-to-work` keeps the scroll at `workTop` while it
  plays, and this move keeps it there for its whole flight, so `atWorkTop()` is
  true during both. Either handoff would otherwise fire inside the other's
  move. See `handoff.ts`.

Every position on this stage is a held rest position, in both directions:
`rest()` takes no argument and always stops Lenis. Nothing below the landing
scrolls freely — the case-study chapters are stepped by gesture too, so there
is no range for the page to scroll through.

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
- Every chapter renders in document flow with its own supplied screenshot.
- Reduced motion: every chapter is immediately readable. No scrub, pin, or
  parallax.
- Touch and narrow windows keep native scrolling and the same complete story.

### The visual layers in cinematic mode

The case-study gallery sits inside the measured slot underneath the travelling
Work frame. Its first image matches the shared frame exactly. Once chapter
scrolling begins, `case-featured` fades the shared image while the frame's
background is already transparent, exposing the gallery with no replacement
flash.

---

## 8. The screenshots

The supplied `public/media/screenshotofSalamCargoo/` set contains five
5760 × 3240 PNGs: branch overview, company overview, bilties, expenses, and
arrival management. Next Image delivers responsive derivatives.

### Why the landed visual looked soft, and the two separate causes

Worth writing down, because the two look identical on screen and only one of
them is about pixels.

**1. `sizes` described the column, not the image.** The slot is 58vw wide and a
full viewport tall. A 16:9 screenshot set to `object-fit: cover` in a box that
tall is painted `100vh * 16/9` = **178vh** wide — at 1440 × 900 that is 1600
CSS px, nearly twice the 826px column it sits in. `sizes` said `60vw` (864px),
so the browser fetched a 1920px derivative for something needing 2400 device px
at the 1.5x scaling most Windows laptops run, and upscaled the difference.

Both the slot images and the shared Work image now say
`(max-width: 899px) 92vw, 180vh`. Stating it in `vh` is not a trick — the
rendered width genuinely depends on viewport *height*, so a `vw` figure is only
ever right at one aspect ratio. `next.config.ts` also gained a **2560**
`deviceSizes` step, because without it the choice at 1.5x is 2048 (still soft)
or 3840 (twice the bytes needed), and quality went to 88: at 75 the small type
in a dense UI screenshot visibly mushes.

Beware `naturalWidth` when checking this. For a srcset-selected image it is
density-corrected, so a 3840px file reports `naturalWidth: 1440`. It looks like
the optimiser is ignoring you. Read the `w=` in `currentSrc` instead.

**2. A locked raster scale.** `.flagship .projectFrame` carried
`will-change: transform` permanently. That promotes it to a composited layer
which Chrome rasterises once at the card's own 354px and then stretches — and
this frame grows 2.3x horizontally and 4.5x vertically, so the landed
screenshot was a blown-up texture no matter how many source pixels were
fetched. The CSS rule is gone; `work-to-cases` now sets `will-change` on the
frame and its media when a move starts and clears it in `onComplete` /
`onReverseComplete`, so the landed frame re-rasterises at its real size.

If softness ever returns, the next suspect is `.projectMotion`, an ancestor of
the frame, which still holds a permanent `will-change: transform, opacity`.

The Work card and landing both start with `01-branch-overview.png`, preserving
the shared-object handoff. After landing, `case-featured` fades that shared
image's opacity only and crossfades the matching gallery underneath. The outer
frame remains owned by `work-to-cases`.

### Featured chapter timeline

`CaseStudies.tsx` owns one labelled, **paused** timeline. There is no
ScrollTrigger: the chapters are stepped, not scroll-linked.

- labels: `intro`, `problem`, `approach`, `solution`, `result`
- chapter *i* is settled at timeline position *i* exactly, and its transition
  occupies the unit before it. That regularity is what lets the stepper move
  the playhead a constant distance and get a constant-speed step every time
- `tweenTo(next, { duration: CHAPTER_TIME, ease: "none" })` — the playhead tween
  is deliberately unaeased, because the fold's own `power2.inOut` is the easing
- each chapter rests one viewport further down, and the move is bracketed by the
  same hold / jump / rest the two section handoffs use

The screenshots **fold**; they do not crossfade. The outgoing panel translates
`yPercent: -100` up out of the slot while the incoming one rises from
`yPercent: 100` below it, both on the same `power2.inOut` curve over the same
0.82 units, so they read as one strip moving rather than two animations that
happen to overlap. Both stay fully opaque — a dissolve reads as two pictures
blending, and the point is that one panel replaces another. The only opacity in
the move belongs to the copy, which starts leaving on the same frame as its own
panel and is gone before the next panel settles, so text is never stranded over
the wrong image.

Constants live at the top of `CaseStudies.tsx`: `FOLD_EASE`, `FOLD_DUR`,
`FOLD_SCALE`, and `CHAPTER_TIME`. The 1.05 lift on the panel leaving and the panel
arriving is deliberately small; a `cover` image only crops further as it
scales, but more than this reads as a zoom rather than a fold.

Slide 0 must sit at exactly `yPercent: 0, scale: 1`, because the travelling
Work frame lands on top of it and hands over.

The pre-hydration guard in `Cases.module.css` is `opacity: 0`, and it **must
not** be a transform. GSAP parses an element's existing computed transform into
its own `x`/`y` cache and then adds `yPercent` on top, so a `translateY(100%)`
guard and the `yPercent: 100` arming compound to 200%: the slides park two
viewports down and the fold lands each incoming panel a full frame below its
slot, permanently invisible. That was a real regression — measured `ty: 1800`
on a 900px frame. Opacity is the only guard that cannot collide with the
transform GSAP owns.

### The slides must load eagerly

Parking them below the frame has a consequence that is easy to miss: **lazy
loading measures the transformed box.** A slide GSAP has parked at
`yPercent: 100` is genuinely off-screen, so Chrome never starts the fetch —
stepping to a chapter then showed a completely empty panel, because the image
only began downloading as it slid in.

The crossfade this replaced never hit it: every slide stayed at `inset: 0` and
only opacity changed, so they all counted as in-view and loaded on their own.

So slides 1–4 carry `loading="eager"`. Only slide 0 is `priority` — the rest
load with the page but without a preload hint, so they never compete with the
one that is actually on screen.

The chapter articles remain in accessible document order. Their inactive
desktop states use opacity rather than visibility, while touch and reduced
motion render all five as ordinary stacked articles.

---

## 9. Verified

Measured at 1440 × 900 unless noted.

`scripts/gesture-check.js` is the one check kept for this: paste it into the
DevTools console on a running dev server at a desktop viewport. It drives real
wheel events and asserts one flick = one step, the exact rest positions, the
reverse returning the Salam Cargo frame to its card, and a reload restoring the
right chapter. It runs in two passes because the reload check needs one — paste
it, let it reload, paste it again. It refuses to run, with a reason, if the
viewport is not the cinematic one or the page is hidden.

| Check | Result |
| --- | --- |
| One gesture forward | a single wheel notch at Work plays the whole move; `scrollY` stays 900 for the entire flight and lands at 1800 |
| Slides parked exactly one frame down | `ty` is 0, 900, 900, 900, 900 at a 900px frame — pure `yPercent` with no cached offset, so `yPercent: 0` lands the incoming panel at `ty: 0`, in frame |
| No CSS transform on anything GSAP transforms | all four Hero `[data-exit]` targets report `cssTransform: "none"`, and `.copy` keeps its centring on its own box (rect unchanged at `46, 209, 340 × 455`) |
| Every chapter image ready before it is needed | all five slot images report `complete: true` with a decoded source on load, and the network shows one `w=1920&q=88` fetch per screenshot |
| One gesture, one beat | the real `handoff.ts` compiled and driven through recorded input patterns: a 2.5s hard trackpad flick (250 events) → **1 step**; a 0.3s gentle flick (25 events) → **1 step**; three deliberate flicks 3s apart → **3 steps**; four single notches 3s apart → **4 steps**; a steady wheel roll for 10s → **5 steps**; an accidental double-tick 100ms apart → **1 step** |
| Seven rest positions | at 1440 × 900: 0, 900, 1800, 2700, 3600, 4500, 5400, with 5400 exactly equal to max scroll |
| Card previews all one height | all four `.projectFrame` boxes measure 354 × 226 at 1440 (335 × 214 at 375), so the near-square flagship screenshot no longer makes its card taller than the other three |
| Landing after the card was un-pinned from the image ratio | with a 354 × 226 frame, the live-box cover form puts the media at 959.6 × 904 against the slide's 955.35 × 900 — a 0.25 × 0 difference once the 2px overscan per side is removed |
| Touch path unaffected by the cover rewrite | at 375: `object-fit: cover`, `transform: none`, no counter-scale — GSAP's `fill` is scoped to the cinematic branch |
| Panel kept out of Work | at Hero, at Work and mid-flight, `[data-cases]` and `[data-case-slot]` are `hidden / 0` and the flagship screenshot inherits `hidden`; all three are `visible / 1` once landed, and `hidden / 0` again after the reverse. This was a real regression: the panel painted an 826 × 900 screenshot through the Work section |
| Full-bleed landing | slot `(0, 0, 826.30×900)`; frame `(-2.10, -2.91, 830.31×904)` — every edge covered, with no seam |
| Reverse | one upward notch returns the frame to `matrix(1, 0, 0, 1, 0, 0)` — its exact card position |
| Reverse state | Work heading, cards, wires and circle all back to `visible / 1`; case copy back to `hidden / 0`; `[data-network]` `pointer-events: auto` |
| Featured chapters | one gesture per chapter: intro 1800, problem 2700, approach 3600, solution 4500, result 5400 — one viewport apart, never scrubbed |
| Chapter reverse | one upward gesture per chapter back to the intro at 1800; only then does a further gesture reverse the outer frame to Work |
| Keyboard | PageDown lands Work at 900 and the case intro at 1800, then advances one chapter per press; PageUp reverses the same way |
| Resize while landed | at 1180 × 800 the slot is `(0, 0, 675.5×800)` and the frame covers it at `(-1.73, -2.47)` through `(677.75, 801.12)` |
| Page end | 5400 at 1440 × 900, which is exactly max scroll; the sticky releases with the result chapter visible and no trailing gap |
| Mobile 390 × 844 | stage/sticky are `relative`; all five chapters have `opacity 1`, their own visible image, and normal document flow |
| Reduced motion | `.stage { height: 600svh }` and the overlapping chapter layout are both gated behind `prefers-reduced-motion: no-preference`; the reduced branch is static. Not re-run under live emulation because the browser harness has no reduced-motion toggle |
| Browser console | no warnings or errors after a clean load and Hero → Work → case → problem interaction |
| Production build | passes; `/` at 23 kB, 184 kB First Load JS |

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

## 10. Lenis ownership, and the blank cream screen

The stage holds one invariant: **`scrollY` is only ever exactly a rest
position.** Every guard that routes a gesture — `atWorkTop()`, `atCasesTop()`,
`onStage()`, `onChapters()` — is a ±4px test, and those are only sound while
nothing can drift the scroll between rests.

For a while one landing broke it. `hero-to-work`'s forward `onComplete` called
`release()`, which restarts Lenis, so Work was the single position on the stage
where the page could still scroll freely. The failure that caused was not
obvious from the symptom:

1. The move lands at `workTop`; Lenis restarts.
2. The tail of the same flick keeps emitting. The gate returns `0` for those
   events, the handler returned early without stopping Lenis, and Lenis scrolled
   the page off the rest position — say to 1400.
3. `atWorkTop()` is now false, so the Hero return is unreachable; and
   `work-to-cases` has no upward branch while its phase is `work`.
4. Nothing intercepts upward scrolling any more. Lenis carries the page up
   through 900 into the Hero's region, where `heroInner` is `autoAlpha: 0` —
   a **blank cream screen**. Observed at `scrollY 540`.

The phase was never wrong. What broke was the position invariant, which then
disabled the only handler that could have recovered.

### The rule

Every arrival at a rest calls `rest()` — stop swallowing, keep the page still.
`release()`, which restarts Lenis, is **teardown only**. After this change the
whole codebase contains exactly two `getLenis()?.start()` calls, both in unmount
cleanup; every other Lenis touch is a `stop()`.

Three sites landed on Work and all three had to change: the forward
`onComplete`, `onFocusIn` (tabbing into Work is a landing too), and `settle()`
reloading straight onto Work. Only the first was obvious.

As a backstop, `work-to-cases` and `case-featured` now stop Lenis on **any**
gesture that reaches their range, including the ones the gate has already
counted as part of an earlier flick. Every landing stops it correctly now; this
keeps the invariant true even if a future landing forgets.

### What this does not cover

`lenis.stop()` only intercepts wheel and touch. A scrollbar drag, middle-click
autoscroll, or a find-in-page jump can still move the document to a non-rest
position, and from there the same soft-lock is reachable. Closing that needs a
scroll-position watchdog, which is a scroll controller — deliberately not built.

When ordinary page content finally lands below the last chapter, that chapter
becomes the one place that must `start()` Lenis again. Until then there is no
"leaving the stage" path, so there is nothing to resume.

---

## 11. Tuning

| Want | Change |
| --- | --- |
| Slower / faster move | `FORWARD_TIME` in `workToCases.ts` (currently `1.9s`) |
| Slower / faster return | `BACK_TIME` (currently `1.5s`) |
| Slower / faster chapter step | `CHAPTER_TIME` in `CaseStudies.tsx` (currently `1.15s`) |
| How readily a gesture counts | `BURST_GAP_MS` / `SETTLE_MS` in `handoff.ts` |
| Add or remove a chapter | `casesContent.ts`, **and** `.stage` height in `Experience.module.css` — it must stay `(chapters + 1) × 100svh` so the last chapter lands on max scroll (currently `600svh` for five) |
| Reorder or re-time beats | the position parameters in the timeline table above |
| Edit chapter copy or screenshot order | `casesContent.ts` |
| Different flight path feel | the flight tween's `ease` (currently `power1.inOut`) |
| Bigger / smaller landed visual | `.panel` grid columns in `Cases.module.css` — the flight measures whatever the slot ends up being |
| A different flagship | `flagship: true` in `workContent.ts` plus a real `image` on that project |

---

## 12. Not built yet

- **Case studies 02–04** — Time Mardan, Danx Detailing, Miru Closet, as the
  short shared entrance pattern. Copy is in `doc/simpleenglish.md`.
- **Case-study ending, contact, footer.**
- The Work cards link to `/work/<slug>` routes that do not exist yet.

### Case-study split

The approved layout now places the visual full-bleed on the **left** and the
story on the right. `doc/moresimple.md` records the same direction.

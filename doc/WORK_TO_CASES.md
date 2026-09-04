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
| `src/components/experience/Experience.tsx` | The shared wrapper. Holds Hero, Work, Case Studies, Ending and Contact, and calls one hook per transition. Owns no motion itself. |
| `src/components/experience/workToCases.ts` | The `work-to-cases` timeline and its gesture handling. |
| `src/components/experience/closingTransitions.ts` | The two nested-curtain timelines, their gesture handling, Closing rest restoration, and Contact → Footer release. |
| `src/components/experience/handoff.ts` | The gesture gate every beat shares: it collapses a flick into one step, enforces a settle window, and holds the one-owner lock. Animates nothing. |
| `src/components/cases/CaseStudies.tsx` | Case Studies structure and content. |
| `src/components/cases/Cases.module.css` | Case Studies layout and static styling. |
| `src/components/cases/casesContent.ts` | Case Studies copy and image data. |
| `src/components/experience/stageBeats.ts` | The register the stage's beats share, so the footer can unwind a story it knows nothing about. Holds `reset`/`settle` per beat plus the `released` and `travelling` flags. Animates nothing. |
| `src/components/ending/Ending.tsx` | The aubergine case-study ending and its nested curtain structure. |
| `src/components/contact/Contact.tsx` | The final contact section. |
| `src/components/contact/siteLinks.ts` | Contact and footer destinations. **Placeholders** — see §12. |
| `src/components/footer/SiteFooter.tsx` | The footer, `data-after-stage` destination, Back to top, and stage-aware navigation. |
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

Work, the first case study, Ending and Contact are children of **one sticky,
viewport-height grid cell**. They all sit in `grid-area: 1 / 1`, so they occupy the
same space and the frame can travel from one layout to the other without ever
leaving the document.

```tsx
<div ref={stageRef} className={styles.stage}>
  <div ref={stickyRef} className={styles.stageSticky}>
    <Work ref={work} />
    <div data-closing-case><CaseStudies /></div>
    <Ending />
    <Contact />
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
  .stage        { height: 800svh; }
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

The experience is **discrete rest positions, not a scrub track**. Work rests at
the stage top, the case landing one viewport later, each remaining chapter one
viewport after that, followed by Ending and Contact. Nothing on this stage is
scroll-linked.

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
| The result | 5400 | Closing timeline state `0/0` |
| Ending | 6300 | Closing timeline state `1/0` |
| Contact | 7200 | Closing timeline state `1/1`; final held beat |
| Footer | 8100 (max scroll) | Sticky released; Lenis active |

`800svh` = eight stage bands of one viewport each. Nothing scrubs across that range —
every beat is stepped by gesture — so it exists only to give each beat a scroll
position of its own, which keeps the scrollbar honest and lets a reload land
back on the right chapter. `casesTop` is `stage.offsetTop + sticky.offsetHeight`
and chapter *i* rests at `casesTop + i * sticky.offsetHeight`, so the last
chapter lands at 5400; Ending and Contact add the final two rests before the
footer at max scroll.

### Stacking

Inside the stage's own stacking context:

```
.stage (z-index 1, below .heroScene at 2)
  └─ .work   z-index 2      ← the travelling frame lives in here
  └─ .cases  z-index 1
  └─ .ending z-index 4
  └─ .contact z-index 5
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
Work frame. Its first image matches the shared frame exactly. On the first
chapter step `case-featured` fades the shared image while the frame's
background is already transparent, exposing the gallery with no replacement
flash.

That fade owns the first **0.1 units of the timeline and nothing more**, so it
is finished before the first mask starts moving. See §8 — with a reveal rather
than a fold, a shared image still fading during the sweep is a ghost of the old
picture lying on top of the new one.

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
  is deliberately unaeased, because the mask's own `power2.inOut` is the easing
- each chapter rests one viewport further down, and the move is bracketed by the
  same hold / jump / rest the two section handoffs use

### The chapters reveal; they do not fold or crossfade

Every panel sits in the slot the whole time at `inset: 0`. A step **uncovers**
the incoming one in place, by opening an `inset()` clip-path on the slide from
its top edge downward, over the panel before it. Nothing translates. The panel
underneath is not animated at all — it is simply covered.

This replaced a vertical fold, where the outgoing panel translated
`yPercent: -100` out of the slot while the incoming one rose from
`yPercent: 100` below. The reveal was chosen because the picture the reader is
actually looking at never moves out from under them, and the incoming one
arrives already at its final framing instead of travelling into it.

Two tweens per step, both starting at the same instant:

| Tween | Target | From → to | Units |
| --- | --- | --- | --- |
| the mask | `[data-case-visual]` | `inset(0% 0% 100%)` → `inset(0% 0% 0%)` | 0.54, `power2.inOut` |
| the settle | the `img` inside it | `scale: 1.08` → `1` | 0.90, `power2.out` |

The settle **outlasts the mask on purpose**: the picture is still easing back to
its true size for a moment after the edge has passed, which is what stops the
reveal reading as a flat wipe. Measured mid-step at 1440 × 900: mask 50% open,
image at `scale 1.0274`; mask fully open, image still at `1.0051`.

`IMAGE_ZOOM` is 1.08 and not the 1.3 of the reference effect, because these are
dense UI screenshots painted `cover` at full viewport height — every step above
1 magnifies the derivative that was actually fetched. See the softness notes
above.

**Nothing in a step may outlast 0.9 units.** The transition starts at `at - 0.9`
and the playhead is stepped between whole numbers and parked, so a tween
reaching past `at` would freeze part-finished until the next gesture. That is
the ceiling `SETTLE_DUR` is sitting on.

The only other opacity in the move belongs to the copy, which starts leaving on
the same frame as its own panel and is gone before the next panel settles, so
text is never stranded over the wrong image.

Constants live at the top of `CaseStudies.tsx`: `MASK_OPEN`, `MASK_SHUT`,
`MASK_EASE`, `MASK_DUR`, `SETTLE_EASE`, `SETTLE_DUR`, `IMAGE_ZOOM`, and
`CHAPTER_TIME`.

Slide 0 must sit fully open at image `scale: 1`, because the travelling Work
frame lands on top of it and hands over.

### Covered panels are dropped from the paint

A fold carried each spent panel out of the slot, so `overflow: hidden` stopped
painting it. A reveal does not: without help, every chapter already passed stays
stacked behind the current one, and the last chapter paints five full-viewport
screenshots in the same box.

So each step ends with a zero-duration `set(visuals[index - 1], { autoAlpha: 0 })`
at position `at` — 0.08 units after the mask above it has finished covering.
It reverses on its own: GSAP restores the recorded value as the playhead crosses
back, a clear 0.36 units before that mask starts reopening, so there is no window
in which a closing mask exposes a hidden panel. Verified in both directions.

### The copy assembles; it does not arrive

The article is a **gate**, not a mover. It carries no motion of its own any
more — a zero-duration `opacity` set turns it on, and the parts inside it do
the work, each on its own beat, so the panel reads in the order it is written
rather than appearing all at once.

| Part | Starts | Lasts | Move |
| --- | --- | --- | --- |
| label | `at - 0.60` | 0.30 | `clip-path` wipe in from the left, with opacity |
| title | `at - 0.52` | 0.38 + 0.14 stagger | each line rises `yPercent: 120 → 0` out of its own mask. No fade |
| body | `at - 0.36` | 0.30 | opacity and `y: 22 → 0` |
| facts | `at - 0.30` | 0.22 + 0.08 stagger | opacity, `y: 14 → 0`, `scale: 0.96 → 1`, `back.out(1.5)` |

Two hard edges bound that window, and both are load-bearing:

- **`at - 0.60`** is when the outgoing block has finished leaving. Nothing may
  start earlier without two chapters' text being on screen together, which is
  the thing §8 keeps insisting on.
- **`at`** is where the playhead parks. Nothing may finish later, for the same
  reason the picture's settle may not — it would freeze part-done until the
  next gesture.

The staggers are `{ amount: … }` and not per-element on purpose: `amount`
spends a fixed budget however many lines or facts a chapter turns out to have,
so adding a longer title cannot walk the animation past `at`.

The **exit stays on the article as one block**, unchanged. A staggered exit
would compete with the staggered entrance answering it half a second later,
and it is the half nobody is reading.

### The title is split, and the split has to be reverted

`SplitText.create(title, { type: "lines", mask: "lines", linesClass: "caseTitleLine" })`.
The `mask` option wraps each line in its own box carrying an inline
`overflow: clip`, and that edge is what a line rises out of — which is why the
title reads as type being set rather than text switching on.

Three things about it are easy to get wrong:

1. **Accessibility is handled, but only because `aria` defaults to `"auto"`.**
   That copies the heading's text onto its own `aria-label` and marks the
   generated pieces `aria-hidden`, so a screen reader still reads one sentence.
   Verified: all four split headings carry the full sentence as `aria-label`.
2. **Descenders.** At `line-height: 1.02` the clip edge lands almost on the
   baseline and shears the tails off g, y and p. `Cases.module.css` gives the
   mask `padding-bottom: 0.16em` to move the edge down and an equal negative
   `margin-bottom` to hand the space back, and `.chapterTitle` is
   `display: flow-root` so that last negative margin cannot collapse out of the
   heading and drag the body copy up. Measured: mask 53px against a 46px line,
   and the title-to-body gap unchanged at its 22px floor.
   `LINE_RISE` must stay above `100 + that padding`, or a parked line peeks over
   its own edge. It is 120.
3. **It must be reverted.** `revert()` puts the original heading markup back, so
   the cleanup kills the timeline *first* — a tween still pointing at a line
   element has to be gone before that element is. Leaving the cinematic
   breakpoint therefore restores plain headings; verified at 820px, where all
   12 line wrappers, all 12 masks and all four `aria-label`s are gone and every
   chapter is readable in document flow.

**Chapter 0 is deliberately left whole** — unsplit, and with no part animation.
Its entrance is the flight landing, owned by `work-to-cases` through
`[data-cases-in="study"]`, and that wrapper is not this timeline's to touch.

### The pre-hydration guard must stay `opacity`

The guard in `Cases.module.css` is `opacity: 0`, and it must not become anything
else, because every other candidate now has an owner: `clip-path` is the mask
itself, and a transform would be read into GSAP's own `x`/`y` cache and
compounded rather than replaced. A `translateY(100%)` guard plus a
`yPercent: 100` arming once compounded to 200% — the slides parked two viewports
down, permanently invisible, measured `ty: 1800` on a 900px frame. Opacity is
the only guard that cannot collide with what GSAP owns.

### The slides load eagerly

Slides 1–4 carry `loading="eager"`. Only slide 0 is `priority` — the rest load
with the page but without a preload hint, so they never compete with the one
that is actually on screen.

This was originally a hard requirement of the fold, and the reason is worth
keeping because it will apply again to anything that parks an image outside the
frame: **lazy loading measures the transformed box.** A slide parked at
`yPercent: 100` is genuinely off-screen, so Chrome never started the fetch, and
stepping to that chapter showed a completely empty panel.

The mask does not have that problem — every slide stays at `inset: 0`, so all
five are in view as far as the loader is concerned and would load on their own.
`eager` is kept anyway: it costs nothing and it is one less thing depending on
how a clipped box is classified.

Being in view does **not** make them Largest Contentful Paint candidates. Until
the flight lands, `[data-case-slot]` is `autoAlpha: 0`, and a `visibility:
hidden` element is not LCP-eligible. Confirmed on a clean load: LCP is the hero
portrait, and no case screenshot appears in the entry list.

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
| Chapter masks arm correctly | on load at 1440 × 900 the five slides report `inset(0%)` then `inset(0% 0% 100%)` × 4 — slide 0 open, the rest shut, all at `opacity: 1` with the CSS guard cleared by `autoAlpha` |
| Mask sweeps top to bottom, in place | seeking one step, the bottom inset runs 100 → 97.46 → 50 → 6.97 → 0% across units 0.1 → 0.64, while the panel underneath holds `inset(0%)` and is never animated. Identical at all four transitions |
| Picture still settling when the edge lands | image `scale` 1.08 → 1.0562 → 1.0274 → 1.0137 → **1.0051 at mask completion** → exactly 1 at `at`. Nothing outlasts the 0.9 units the step owns |
| Covered panels dropped from the paint | painted set at rests 0–4: `VVVVV`, `-VVVV`, `--VVV`, `---VV`, `----V` — by the last chapter only its own slide is painted |
| Reverse restores paint before the mask reopens | stepping back, the set restores in lockstep to `VVVVV`, and the restore lands 0.36 units before the mask above it starts closing — verified by seek and by four real upward flicks |
| Shared Work image gone before the first mask moves | retimed to own units 0 → 0.1: opacity 1 / 0.5 / 0 at t = 0, 0.05, 0.1 while slide 1 is still fully shut. It previously ran 0.1 → 0.5, straight through the sweep, sitting at **0.21 opacity with the mask half open** and ghosting the old picture over the new one |
| Chapter step frame timing | one real flick, dev build, 131 frames: median **16.6ms**, p90 19.2ms, p99 32.8ms, 2 frames over 32ms — while the synthetic flick was itself dispatching 150 wheel events. Trace reports CLS 0.00 and no jank insight |
| Reveal is LCP-safe | clean load, no interaction: LCP is the hero portrait; no case screenshot appears in the entry list, because `[data-case-slot]` is `visibility: hidden` until the flight lands. Slides being in view at `inset: 0` does not make them candidates |
| Closing curtains | at 1440 × 900, result → Ending lands 5400 → 6300 and Ending → Contact lands 6300 → 7200. At roughly 49% background coverage the label/support remain at opacity 0 and heading characters remain fully parked; the first label appears at roughly 72% coverage. The berry/lilac surface is the only painted background, all three wrappers land at zero transform, and reverse restores `+900 / -900 / +135px` with the result chapter visible and active |
| Closing frame timing | production build, result → Ending, 88 sampled frames: median **16.7ms**, p95 16.8ms, p99 16.9ms, worst 17.1ms, **0 frames over 32ms**, CLS **0.0000** |
| Footer release | one further gesture from Contact glides 7200 → 8100, the footer's exact top and page maximum; an upward flick re-captures Contact at 7200 |
| One long flick, one closing beat | a 1.5s synthetic wheel burst at 30ms intervals advances result → Ending only, never straight through to Contact |
| Back to top | from 4981: 624 → 88 → 9 → 0, hero `visible`, chapters back to `[1,0,0,0,0]`, slides back to `[open, shut × 4]`. The story then replays from the beginning |
| Footer links into the stage | Work and Case Studies still restore their existing rests; Contact now restores 7200 directly. `work-to-cases` uses `tl.progress(1, true)` so settling a deeper beat cannot replay its completion jump back to the case intro |
| Deep restoration | fresh `#ending` and `#contact` loads land 6300 / 7200 with the correct panel visible; a page-bottom reload restores 8100 with the footer at viewport top |
| Static mode | at 390 × 844 and under live reduced-motion emulation the sticky is `relative`, Ending/Contact are visible and non-inert in document flow, and the footer remains reachable |
| Chapter copy cascades in order | seeking one step: gate opens at `at - 0.60`, label clip 100 → 57.9 → 12.5 → 0.8 → 0%, title lines at 55/55/55 → 24/55/55 → 6/19/44 → 0/3/10 → 0/0/0 px, then body and facts. Everything is at rest by `at` |
| Title splits, and only where it should | 3 lines and 3 masks on each of chapters 1–4; chapter 0 unsplit, because its entrance belongs to `work-to-cases` |
| Split is invisible to assistive tech | all four split headings carry the full sentence as `aria-label`, generated pieces are `aria-hidden` |
| Descenders survive the mask | 53px mask against a 46px line; g, y and p render whole on *Every booking. Every handoff. One system.* Title-to-body gap unchanged at its 22px floor, so the negative margin is not collapsing out |
| Split reverts leaving cinematic | at 820px: 0 line wrappers, 0 masks, 0 `aria-label`s left, all five titles back to plain text, every chapter `opacity: 1` in document flow — and re-arms to 12 lines on the way back up |
| Step frame timing with the copy animating | one real flick, dev build, 131 frames: median **16.7ms**, p90 16.8, p99 17.5, worst 17.9 — **0 frames over 20ms**. Adding the copy cascade did not cost a frame |
| Forward and reverse walk | five chapters forward then five back by real flicks: masks open and close in order, chapter copy tracks, and every rest lands exactly one viewport apart in both directions |
| No CSS transform on anything GSAP transforms | all four Hero `[data-exit]` targets report `cssTransform: "none"`, and `.copy` keeps its centring on its own box (rect unchanged at `46, 209, 340 × 455`) |
| Every chapter image ready before it is needed | all five slot images report `complete: true` with a decoded source on load, and the network shows one `w=1920&q=88` fetch per screenshot |
| One gesture, one beat | the real `handoff.ts` compiled and driven through recorded input patterns: a 2.5s hard trackpad flick (250 events) → **1 step**; a 0.3s gentle flick (25 events) → **1 step**; three deliberate flicks 3s apart → **3 steps**; four single notches 3s apart → **4 steps**; a steady wheel roll for 10s → **5 steps**; an accidental double-tick 100ms apart → **1 step** |
| Closing landmarks | at 1440 × 900: Hero 0, Work 900, case intro 1800, chapters 2700 / 3600 / 4500 / result 5400, Ending 6300, Contact 7200, footer 8100; the footer is page maximum |
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
| Page end | 8100 at 1440 × 900, exactly the footer top and max scroll; the sticky releases after Contact |
| Mobile 390 × 844 | stage/sticky are `relative`; all five chapters have `opacity 1`, their own visible image, and normal document flow |
| Reduced motion | `.stage { height: 800svh }` and every overlapping panel are gated behind `prefers-reduced-motion: no-preference`; live emulation confirms the reduced branch is static, visible and native-scrollable |
| Browser console | no warnings or errors after a clean load and Hero → Work → case → problem interaction |
| Production build | passes; `/` at 28.1 kB, 192 kB First Load JS |

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

That last paragraph used to read *when ordinary page content finally lands*
*below the last chapter, that chapter becomes the one place that must*
*`start()` Lenis again.* It has landed. See §13.

The scrollbar-drag hole is now partly closed as a consequence, because the
one position it could strand the page in — below the story — is exactly the
boundary §13 had to watch anyway. Dragging *within* the stage is still
uncovered.

---

## 11. Tuning

| Want | Change |
| --- | --- |
| Slower / faster move | `FORWARD_TIME` in `workToCases.ts` (currently `1.9s`) |
| Slower / faster return | `BACK_TIME` (currently `1.5s`) |
| Slower / faster chapter step | `CHAPTER_TIME` in `CaseStudies.tsx` (currently `1.15s`) |
| Faster / slower mask sweep | `MASK_DUR` (currently `0.54` units) and `MASK_EASE` |
| More / less zoom on the arriving picture | `IMAGE_ZOOM` (currently `1.08`) — above ~1.12 the screenshot magnifies visibly |
| How long the picture keeps settling | `SETTLE_DUR` (currently `0.9`) and `SETTLE_EASE`. **0.9 is the ceiling**, see §8 |
| Re-time any part of the chapter copy | the `COPY` table at the top of `CaseStudies.tsx`. Every `at` is negative and relative to the chapter landing; keep them inside `COPY_OPENS`…`0` |
| More / less cascade across title lines or facts | the `amount` values in `COPY`. Use `amount`, never a per-element stagger, so a longer title cannot overrun |
| How far a title line waits below its mask | `LINE_RISE` (currently `120`) — must stay above 100 + the mask padding in `Cases.module.css` |
| Descenders clipped on a title | the `padding-bottom` / `margin-bottom` pair on `.chapterTitle :global(.caseTitleLine-mask)`; move them together |
| How readily a gesture counts | `BURST_GAP_MS` / `SETTLE_MS` in `handoff.ts` |
| Add or remove a chapter | `casesContent.ts`, **and** `.stage` height in `Experience.module.css` — it must stay `(chapters + 3) × 100svh`: Work + all chapters + Ending + Contact (currently `800svh` for five chapters) |
| Reorder or re-time beats | the position parameters in the timeline table above |
| Edit chapter copy or screenshot order | `casesContent.ts` |
| Different flight path feel | the flight tween's `ease` (currently `power1.inOut`) |
| Bigger / smaller landed visual | `.panel` grid columns in `Cases.module.css` — the flight measures whatever the slot ends up being |
| A different flagship | `flagship: true` in `workContent.ts` plus a real `image` on that project |

---

## 13. Leaving the stage

Ending and Contact now belong to the same cinematic stage as the flagship case
study. The footer is the first ordinary-flow surface below it.

### Geometry and ownership

With five case chapters, `.stage` is `800svh`: one band for Work, five for the
case landing/chapters, one for Ending and one for Contact. At 1440 × 900 the
logical rests are Work 900, case intro 1800, result 5400, Ending 6300 and
Contact 7200. The footer starts at 8100, exactly one viewport after Contact and
exactly equal to page maximum because the footer itself is at least `100svh`.

`case-featured` stops at the result. `closing-sequence` owns both later seams
and the only final release. This avoids two listeners trying to leave the case
stage on the same gesture.

### The two approved curtains

Both moves reuse the same paused structure from the supplied reference:

- outgoing surface: `yPercent: 0 → -15`
- incoming outer wrapper: `100 → 0`
- incoming inner wrapper: `-100 → 0`
- incoming surface: `15 → 0`
- the panel roots stay transparent; only the moving surfaces paint berry or
  lilac, so no full-screen colour can appear before the curtain reaches it
- background sweep: `0.94s`, `power3.inOut`
- the label begins once the surface is about two-thirds revealed, followed by
  ordered masked SplitText characters and supporting copy; the whole move
  settles at about `1.22s`

The timelines reverse for upward gestures. They do not use Observer, wrap
around, scrub, or global fixed-section CSS. `handoff.ts` still decides when a
gesture counts, Lenis stays stopped, and the scroll jumps to the new logical
rest only after the timeline lands. Inactive panels are both `visibility:
hidden` and `inert`, so their links cannot receive focus; a keyboard reversal
moves focus out of the panel being hidden.

### Contact → Footer, and coming back

One gesture down from Contact sets `stageReleased(true)` and runs a forced
Lenis glide to the footer while Lenis remains stopped. The temporary event hold
stays through the 520ms tail window, then Lenis restarts. Starting Lenis first
would let the initiating flick pass the footer rest.

Scrolling upward from the footer re-captures Contact at 7200. The same three
guards still apply: cross the rest by 8px before re-entry, swallow the tail for
700ms, and ignore the boundary while `stageTravelling()` marks a deliberate
footer navigation or Back-to-top journey.

### Restoration and footer navigation

The closing beat settles last (order 3), after Hero, Work and the case chapter
state. Result / Ending / Contact are represented by timeline states `0/0`,
`1/0`, and `1/1`; positions below Contact show `1/1`, set released, and restart
Lenis. Fresh `#ending` and `#contact` loads map their physical overlapping DOM
anchors to the correct logical rests.

Footer links to Work, Case Studies and Contact therefore reset, jump and call
`settleStage()` instead of using ordinary hash scrolling. Restoration seeks
`work-to-cases` with `tl.progress(1, true)`: suppressing callbacks is essential,
because replaying its forward completion would jump a Contact restore back to
the case-study intro. Back to top still resets every beat before gliding home.

---

## 12. Not built yet

- **Case studies 02–04** — Time Mardan, Danx Detailing, Miru Closet, as the
  short shared entrance pattern. Copy is in `doc/simpleenglish.md`. These belong
  **between** the flagship and the ending, so the ending's *Different problems.*
  *Same approach.* currently follows a single case study rather than four.
  Inserting them requires extending the stage/flow before the two closing
  beats; `[data-after-stage]` remains on the footer because it marks the final
  release, not the case-to-ending seam.
- An **About** section. `doc/moresimple.md` lists it in the footer navigation;
  the link is left out until there is something to point at.
- The Work cards link to `/work/<slug>` routes that do not exist yet.
- Real destinations for the contact email and the social links. They are
  deliberately obvious placeholders in `src/components/contact/siteLinks.ts`.

### Case-study split

The approved layout now places the visual full-bleed on the **left** and the
story on the right. `doc/moresimple.md` records the same direction.

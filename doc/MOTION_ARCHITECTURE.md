# Motion architecture

This is the technical source of truth for animation. Read it with `doc/moresimple.md` before changing a section or transition.

`doc/WORK_TO_CASES.md` is the implementation record for the built `work-to-cases` transition and the shared stage it runs on. This file says who owns what; that one says how the approved behaviour was actually made and what was measured.

## One owner for every job

| Job | Owner | Rule |
| --- | --- | --- |
| Structure, content, accessibility, and discrete UI state | TypeScript + React (`.tsx`) | React may store states such as `activeProject` or `menuOpen`. It must not store pointer coordinates, scroll progress, or tweened values. |
| Layout, typography, color, responsive styling, and static hover styling | CSS Modules (`.module.css`) | CSS must not transition or keyframe a property that GSAP controls on the same element. |
| Element movement, fades, sequencing, pointer response, and SVG line drawing | GSAP core + timelines | GSAP is the only runtime element-animation library. Prefer `x`, `y`, `scale`, rotation, and `autoAlpha`. |
| Scroll start/end, scrub, pinning, and scroll-linked progress | GSAP ScrollTrigger | Put one ScrollTrigger on the section's top-level timeline, never on its child tweens. The whole Hero → Work → Case Studies → Ending → Contact stage is the documented exception: it reads scroll *intent* instead, see below. |
| When a gesture counts, and who owns the page | `src/components/experience/handoff.ts` | Every beat on the stage intercepts the window's wheel and holds the scroll. This module animates nothing: it collapses a flick's many events into one step, enforces a settle window after each move, and holds one owner so two beats can never run at once. Nothing else belongs in that file. |
| Desktop scroll smoothing | Lenis | Lenis moves the scroll position only. It does not animate page elements or decide section state. On the cinematic stage it stays **stopped at every rest position** — Hero, Work, the case landing, each chapter, Ending, and Contact — because the gesture guards are ±4px tests that only hold while the scroll cannot drift between rests. Contact is the final held beat; one further gesture glides to the footer, then restarts Lenis. See `doc/WORK_TO_CASES.md` §10 and §13. |
| Vector structure | Inline SVG in TSX | SVG defines paths and shapes; GSAP animates their motion and stroke values. CSS owns their static color and thickness. |
| Route changes, if animated later | Native View Transition API | It may own a route handoff, but it must not animate a property that GSAP is animating at the same time. |
| Interaction and performance checks | Playwright and Chrome DevTools | Testing tools only; never runtime dependencies. |

> **Changed from the original plan.** Ending and Contact now complete the gesture-held stage with the approved nested curtain transition. The footer remains the calm release: one small entrance, then one pointer-local GSAP liquid-type response with no idle loop.

Do not add Motion/Framer Motion, Three.js, another smooth-scroll package, CSS animation libraries, or a custom animation framework. Add a library only after the user approves a specific effect that this stack cannot reasonably produce.

### Property boundary

The same DOM element and CSS property must have one owner. If GSAP controls an element's `transform` or `opacity`, do not also control that property with a CSS transition, CSS keyframe, React inline style, or another library.

Use nested elements when two kinds of behavior are needed:

```tsx
<div ref={motionRef} className={styles.motionLayer}>
  <article className={styles.surface}>...</article>
</div>
```

GSAP may transform and fade `motionLayer`. CSS may style the layout, color, border, and hover color of `surface`. Neither system touches the other's properties.

#### A *static* CSS transform counts as an owner

This is the trap, because it does not look like animation. GSAP parses an
element's existing computed transform into its own `x`/`y` cache before it
tweens, so a static CSS transform is silently absorbed and then discarded:

- `transform: translateY(-50%)` used for centring, plus a tween ending at
  `y: 0`, drops the element by half its own height and never puts it back.
  This is exactly what `.copy` in the Hero did — GSAP reported a cached
  `y: -227.312`, and `gsap.set(el, { y: 0 })` flattened it to `matrix(1,0,0,1,0,0)`.
- `transform: translateY(100%)` used as a resting state, plus `yPercent: 100`
  in the arming, **compounds to 200%** — the two do not replace each other.
  This is exactly what parked the case-study slides two viewports down, where
  the fold then landed the incoming panel a full frame below its slot.

So: if GSAP animates an element's transform, that element must have **no CSS
transform at all**, not even a static one. Put the static transform on a parent
and give GSAP its own box. Use `opacity` for a pre-hydration resting state —
it is the only guard that cannot collide with a transform.

## Section and transition map

| Area | Structure and state | Motion owner | Exact responsibility |
| --- | --- | --- | --- |
| Header and navigation | React + CSS Modules | Hero GSAP timeline during the cinematic exit; CSS for ordinary link color/underline | GSAP alone owns nav `autoAlpha`/transform during Hero → Work. CSS must not animate those properties on the same nav nodes. |
| Hero: balanced / Designer / Developer | React TSX + CSS Modules | GSAP core | Pointer handlers use GSAP setters/`quickTo()` for depth, lighting, clothes, cards, and code layers. Keep continuous pointer values outside React state. No ScrollTrigger is involved. |
| Hero → Work | One React wrapper containing both scenes and the cream torso mask | One GSAP timeline driven by scroll intent, not ScrollTrigger: `hero-to-work` | One gesture plays the whole move while the page is held still. This timeline alone fades the hero UI, scales the person toward the viewer, expands the cream torso mask until it covers the viewport using the exact Work background color, then removes the Hero and reveals Work without a visible cut. It jumps the scroll to the stage top only once the move has landed. |
| Work entrance | React TSX + inline SVG | One GSAP timeline with one ScrollTrigger: `work-intro` | Reveal the heading and centre graphic, draw SVG lines, then reveal projects. Use a discrete entrance, not a scrubbed timeline, unless the approved design changes. |
| Work project interaction | React owns `activeProject`; CSS owns static surface styles | GSAP core | GSAP alone scales/fades projects, activates line strokes, reacts the centre graphic, and moves the cursor label. Wrap event-created animations with `contextSafe()`. Keyboard focus must trigger the same state as pointer hover. |
| Work → Case Studies | `Experience.tsx`, which holds Work and the first case study in one sticky viewport-height grid cell | One paused GSAP timeline driven by scroll intent: `work-to-cases`, in `workToCases.ts` | Fades and slightly shrinks the three secondary previews, dissolves SVG lines, shrinks the centre impact circle, fades the Work heading upward, and transforms the same Salam Cargo preview from its Work position into the full-bleed left-side visual. The element that travels is the Work card's own `.projectFrame`; the case study's left side is an empty measured slot. The outer frame maps to that slot while its inner image counter-scales to crop without distortion. Only the project title appears at the landing. Like `hero-to-work`, one gesture plays the whole move while the page is held still, and one upward gesture at the landing seam reverses the identical timeline back to the exact Work layout. |
| Flagship case study | React content in accessible reading order + CSS layout | One labelled, **paused** GSAP timeline stepped by gesture: `case-featured` | After the `work-to-cases` handoff, intro → problem → approach → solution → result advance one chapter per gesture, never scrubbed. The screenshots **reveal**: every panel sits in the slot at `inset: 0`, and a step opens an `inset()` clip-path on the incoming one from its top edge down, over the panel before it, while the image inside it settles out of a slight zoom. Nothing translates and nothing crossfades. The chapter copy assembles instead of arriving as a block: the article is only a gate, and the parts inside it — label, title lines, body, facts — each land on their own beat inside the window the outgoing block has just vacated. The title is split into masked lines with SplitText and rises line by line. The copy still leaves as one block, and still leaves with the screenshot it belongs to.

This section owns `clip-path` on `[data-case-visual]` and on the chapter label, `transform` on the case image and on the title lines, and `opacity` on the chapter article, body and facts — CSS must set none of them, not even statically. Chapter 0 is the exception in both halves: its title is deliberately left unsplit and its copy entrance belongs to `work-to-cases`, which owns `[data-cases-in="study"]`. `work-to-cases` alone still owns the outer frame's movement between layouts. Touch and reduced-motion modes render every chapter in normal document flow. |
| Remaining case studies | React + CSS Modules | One shared GSAP entrance pattern | Short reveals only. No pinning, parallax, or separate animation framework. |
| Case result → Ending → Contact | `Experience.tsx` holds all three as same-cell panels; Ending and Contact each provide `outer > inner > surface` wrappers | Two paused GSAP timelines driven by scroll intent: `closing-sequence`, in `closingTransitions.ts` | At each approved seam, the outgoing surface moves `yPercent: -15`; the incoming outer/inner wrappers counter-slide `100/-100 → 0`; the incoming surface settles `15 → 0`; SplitText characters and the supporting copy reveal inside that same move. One gesture advances one panel and the same timeline reverses upward. GSAP owns transform/opacity on these wrappers, split characters and `[data-closing-copy]`; CSS owns layout, color, type and Contact hover. No Observer, looping, scrub or page-wide fixed-section rules. |
| Footer | React + CSS Modules + one inline SVG filter | One short GSAP entrance plus a scoped fine-pointer hover | The rule draws and the columns lift, close-staggered and small. CSS owns colors, underlines and icon shifts. GSAP alone animates the shared SVG displacement attribute and applies the temporary filter to `[data-liquid-text]`; each hover is one pulse that returns to zero and removes its filter even while the pointer remains. Leave and unmount also clean it up. Touch and reduced-motion modes do not create the hover motion. `doc/moresimple.md` asks for a calm ending after the animated parts of the site, so nothing loops. |
| Back to top, and footer links into the stage | React click handler + `stageBeats.ts` | Lenis when active, otherwise native browser scroll | Use one branch. Never start Lenis and native smooth scrolling together. Work, Case Studies and Contact cannot be plain `#hash` jumps: their DOM overlaps inside the sticky stage, while their logical rests are separate. Reset, move, then settle without replaying timeline completion callbacks. See §13 of `doc/WORK_TO_CASES.md`. |

## Device modes

Use one `gsap.matchMedia()` setup per animated section.

| Mode | Behavior |
| --- | --- |
| Desktop, fine pointer, normal motion | Full approved GSAP timelines and restrained Lenis smoothing. |
| Touch/coarse pointer | Native scrolling, no custom cursor or pointer parallax, shorter GSAP entrances, and no prolonged pinning. Essential content stays visible. |
| `prefers-reduced-motion: reduce` | Lenis off; no scrub, parallax, or pinning. Set the final readable states directly or use a very short fade. |

## File ownership

Keep the implementation local and boring:

- Register GSAP, `useGSAP`, ScrollTrigger, MotionPathPlugin and SplitText once in `src/lib/gsap.ts`. Nothing else calls `registerPlugin`. SplitText is a GSAP plugin, not a second animation library, so it does not touch the rule below about adding frameworks — but it does rewrite DOM, so whatever creates a split also owns reverting it.
- Keep Lenis setup in one client component, `src/components/SmoothScroll.tsx`.
- Keep local motion inside its section. A transition spanning sections belongs to their nearest shared wrapper.
- `src/components/experience/stageBeats.ts` is the second shared-state module, alongside `handoff.ts`, and the same rule applies: it animates nothing and decides nothing. Each beat registers its own `reset` and `settle`, and it holds two flags — `released` (the story has handed the page back) and `travelling` (something is deliberately crossing the boundary). It exists because the footer has to be able to unwind a story it knows nothing about.
- Keep a transition that changes two sections in their nearest shared wrapper. `Experience.tsx` holds the full handoff chain and calls `heroToWork.ts`, `workToCases.ts`, and `closingTransitions.ts`; the three share only the owner flag and key sets in `handoff.ts`.
- Every handoff is gesture driven: a wheel notch or key plays a whole timeline at its own eased pace while the page is held still, then parks the scroll at the landing panel's logical rest position.
- A transition may animate a wrapper layer around an element another timeline owns (`[data-cases-out]` around Work's cards, heading and SVGs). Adding a layer is the correct fix when two timelines need the same visual result on the same box; sharing the property is not.
- Scope every `useGSAP()` call to a component ref and clean up event listeners. Create ScrollTriggers in page order.
- Use timeline labels instead of delay chains. Keep values next to the section until a value is genuinely reused.

Do not build a central animation framework or a global timeline containing the entire site. Local ownership makes each section easier to replace without breaking the rest.

## Change checklist

Before adding or editing motion:

1. Find the area in the table above and edit only its named owner.
2. Check that no CSS rule, React style, or second tween also owns the changed property.
3. Confirm desktop, touch, and reduced-motion behavior.
4. Verify keyboard focus for interactive Work items and confirm all text remains readable without animation.
5. Use Playwright for behavior and Chrome DevTools only when a performance trace is needed.

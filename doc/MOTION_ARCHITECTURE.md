# Motion architecture

This is the technical source of truth for animation. Read it with `doc/moresimple.md` before changing a section or transition.

`doc/WORK_TO_CASES.md` is the implementation record for the built `work-to-cases` transition and the shared stage it runs on. This file says who owns what; that one says how the approved behaviour was actually made and what was measured.

## One owner for every job

| Job | Owner | Rule |
| --- | --- | --- |
| Structure, content, accessibility, and discrete UI state | TypeScript + React (`.tsx`) | React may store states such as `activeProject` or `menuOpen`. It must not store pointer coordinates, scroll progress, or tweened values. |
| Layout, typography, color, responsive styling, and static hover styling | CSS Modules (`.module.css`) | CSS must not transition or keyframe a property that GSAP controls on the same element. |
| Element movement, fades, sequencing, pointer response, and SVG line drawing | GSAP core + timelines | GSAP is the only runtime element-animation library. Prefer `x`, `y`, `scale`, rotation, and `autoAlpha`. |
| Scroll start/end, scrub, pinning, and scroll-linked progress | GSAP ScrollTrigger | Put one ScrollTrigger on the section's top-level timeline, never on its child tweens. The two handoffs are the documented exception: they read scroll *intent* instead, see below. |
| Which handoff owns the page | `src/components/experience/handoff.ts` | `hero-to-work` and `work-to-cases` both intercept the window's wheel and both hold the scroll. One module-level owner keeps either from reacting while the other plays. Nothing else belongs in that file. |
| Desktop scroll smoothing | Lenis | Lenis moves the scroll position only. It does not animate page elements or decide section state. |
| Vector structure | Inline SVG in TSX | SVG defines paths and shapes; GSAP animates their motion and stroke values. CSS owns their static color and thickness. |
| Route changes, if animated later | Native View Transition API | It may own a route handoff, but it must not animate a property that GSAP is animating at the same time. |
| Interaction and performance checks | Playwright and Chrome DevTools | Testing tools only; never runtime dependencies. |

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

## Section and transition map

| Area | Structure and state | Motion owner | Exact responsibility |
| --- | --- | --- | --- |
| Header and navigation | React + CSS Modules | Hero GSAP timeline during the cinematic exit; CSS for ordinary link color/underline | GSAP alone owns nav `autoAlpha`/transform during Hero → Work. CSS must not animate those properties on the same nav nodes. |
| Hero: balanced / Designer / Developer | React TSX + CSS Modules | GSAP core | Pointer handlers use GSAP setters/`quickTo()` for depth, lighting, clothes, cards, and code layers. Keep continuous pointer values outside React state. No ScrollTrigger is involved. |
| Hero → Work | One React wrapper containing both scenes and the cream torso mask | One GSAP timeline with one ScrollTrigger: `hero-to-work` | This timeline alone fades the hero UI, scales the person toward the viewer, expands the cream torso mask until it covers the viewport using the exact Work background color, then removes the Hero and reveals Work without a visible cut. Animate a child of any pinned element, not the pinned element itself. |
| Work entrance | React TSX + inline SVG | One GSAP timeline with one ScrollTrigger: `work-intro` | Reveal the heading and centre graphic, draw SVG lines, then reveal projects. Use a discrete entrance, not a scrubbed timeline, unless the approved design changes. |
| Work project interaction | React owns `activeProject`; CSS owns static surface styles | GSAP core | GSAP alone scales/fades projects, activates line strokes, reacts the centre graphic, and moves the cursor label. Wrap event-created animations with `contextSafe()`. Keyboard focus must trigger the same state as pointer hover. |
| Work → Case Studies | `Experience.tsx`, which holds Work and the first case study in one sticky viewport-height grid cell | One paused GSAP timeline driven by scroll intent: `work-to-cases`, in `workToCases.ts` | Fades and slightly shrinks the three secondary previews, dissolves SVG lines, shrinks the centre impact circle, fades the Work heading upward, reveals the Case Studies title, and transforms the same Salam Cargo preview from its Work position into the full-bleed left-side visual of the first case study. The element that travels is the Work card's own `.projectFrame`; the case study's left side is an empty measured slot. The outer frame maps to that slot while its inner image counter-scales to crop without distortion. Like `hero-to-work`, one gesture plays the whole move while the page is held still, and one upward gesture reverses the identical timeline back to the exact Work layout. |
| Flagship case study | React content in accessible reading order + CSS layout | One labelled GSAP timeline with one ScrollTrigger: `case-featured` | After the `work-to-cases` handoff is complete, one pinned stage owns intro → problem → approach → solution → result. It may animate an inner visual layer, while `work-to-cases` alone owns the outer Salam Cargo visual's transition between section layouts. Put the ScrollTrigger on the master timeline and use labels for every chapter. |
| Remaining case studies | React + CSS Modules | One shared GSAP entrance pattern | Short reveals only. No pinning, parallax, or separate animation framework. |
| Case-study ending | React + CSS Modules | One short GSAP entrance | Reveal the closing statement once; no scrub or pin. |
| Contact and footer | React + CSS Modules | CSS only | Keep the ending calm. Use static layout and small link hover styles; no ScrollTrigger. |
| Back to top | React click handler | Lenis when active, otherwise native browser scroll | Use one branch. Never start Lenis and native smooth scrolling together. |

## Device modes

Use one `gsap.matchMedia()` setup per animated section.

| Mode | Behavior |
| --- | --- |
| Desktop, fine pointer, normal motion | Full approved GSAP timelines and restrained Lenis smoothing. |
| Touch/coarse pointer | Native scrolling, no custom cursor or pointer parallax, shorter GSAP entrances, and no prolonged pinning. Essential content stays visible. |
| `prefers-reduced-motion: reduce` | Lenis off; no scrub, parallax, or pinning. Set the final readable states directly or use a very short fade. |

## File ownership

Keep the implementation local and boring:

- Register GSAP, `useGSAP`, and ScrollTrigger once in `src/lib/gsap.ts`.
- Keep Lenis setup in one client component, `src/components/SmoothScroll.tsx`.
- Keep each section's local timeline inside that section component.
- Keep a transition that changes two sections in their nearest shared wrapper. `src/components/experience/Experience.tsx` is that wrapper for the whole handoff chain: it holds the DOM the transitions reach across and calls one hook per transition — `heroToWork.ts` and `workToCases.ts` — so neither transition lives in two competing components. The only state those two share is the owner flag and the key sets in `handoff.ts`.
- Both handoffs are gesture driven: a wheel notch or key plays a whole timeline at its own eased pace while the page is held still, then parks the scroll at the landing section's rest position. Adding a third handoff means claiming the same lock, holding the same way, and giving the new section a rest position of its own.
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

---
name: portfolio-motion
description: Implement or refine the cinematic motion system for Saad's Designer x Developer portfolio. Use for its hero transformation, scroll transitions, Work interactions, case-study motion, responsive fallbacks, social-ready sequences, or animation performance.
---

# Portfolio Motion

Read [the approved experience](../../../doc/moresimple.md) before changing animation behavior. Then read [the motion architecture](../../../doc/MOTION_ARCHITECTURE.md) for the exact language, library, section, transition, and property owners. Preserve its four signature moments and its shortened case-study structure.

## Technical direction

- Follow the ownership table in `doc/MOTION_ARCHITECTURE.md`; do not improvise a second animation owner.
- Use TypeScript/React for structure and discrete state, CSS Modules for layout and static styling, GSAP for element motion, ScrollTrigger only for scroll linkage, Lenis only for desktop scroll smoothing, and inline SVG for vector structure.
- Use the installed official GSAP skills relevant to the task, especially `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, and `gsap-performance`.
- Give each DOM element and property one owner. If needed, use nested elements to separate a GSAP motion layer from a CSS surface layer.
- Keep continuous pointer and scroll values outside React state. Scope GSAP with `useGSAP()`/`gsap.context()` and clean it up on unmount.
- Prefer transforms and opacity. Use filters, blur, shadows, and layout-changing properties sparingly and measure them on real devices.
- Do not add Motion, Three.js, another smooth-scroll library, or a custom animation framework unless a requested effect cannot be implemented cleanly with the existing stack.

## Experience invariants

- The hero defaults to a readable balanced state; pointer interaction enhances it but never carries essential information.
- Desktop may use pointer depth, clothing/lighting crossfades, a custom cursor, Lenis, and pinned storytelling.
- Touch devices use intentional tap/scroll states, no hover-only content, no custom cursor, native-feeling scrolling, and shorter motion.
- Honor `prefers-reduced-motion`: keep all content and navigation available, remove smoothing/parallax/prolonged pinning, and use direct state changes or short fades.
- Keep case-study text in accessible document order even when the desktop presentation visually changes it by chapter.
- Make the first flagship case study cinematic; keep the remaining studies shorter.
- Design the signature sequences to read clearly in 16:9 and 9:16 screen recordings, with the first strong visual response available within the opening seconds.

## Implementation workflow

Inspect the existing structure and dependencies before editing. Build the smallest complete sequence that proves the motion direction, then verify desktop, touch, reduced motion, keyboard access, cleanup, and scroll restoration. Use Playwright for interaction checks and Chrome DevTools for performance traces when those MCP servers are available.

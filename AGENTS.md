# Saad Portfolio

## Source of truth

- Read `doc/moresimple.md` before changing the experience, layout, copy, or animation direction.
- Read `doc/MOTION_ARCHITECTURE.md` before changing animation code, libraries, section ownership, or transitions. Its ownership table is mandatory.
- Use the `portfolio-motion` skill for hero, scroll, Work, case-study, responsive-motion, or animation-performance tasks.
- This repository currently contains the approved brief and AI tooling only. Do not scaffold the application unless the user asks.

## Planned stack

- Next.js, React, and TypeScript (`.tsx`) for structure, content, accessibility, and discrete state
- CSS Modules for layout and static visual styling
- GSAP with ScrollTrigger for cinematic choreography
- Lenis only for restrained desktop scroll smoothing
- Inline SVG for vector structure; GSAP for SVG motion

Do not add Motion, Three.js, another smooth-scroll library, or a custom animation framework without a concrete missing capability.

## Motion rules

- The animation is intentionally noticeable and social-media friendly, but every movement must support one of the approved signature moments.
- Follow the section-by-section owners in `doc/MOTION_ARCHITECTURE.md`.
- The same DOM element and property must have one owner. If GSAP owns a transform or opacity, CSS, React, and other libraries must not also animate it.
- ScrollTrigger connects a top-level GSAP timeline to scroll. Lenis only smooths scroll. Neither replaces or duplicates GSAP's element animation.
- Prefer transform and opacity; measure filters, blur, shadows, and large painted layers.
- Desktop and touch are separate motion compositions. Do not depend on hover or pointer position for content or navigation.
- Honor `prefers-reduced-motion` without hiding content.
- Keep case-study content in accessible document order and keep the non-flagship studies short.

## Relevant project skills

- GSAP implementation: `gsap-core`, `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-plugins`, `gsap-utils`
- Animation performance: `gsap-performance`, `performance`, `core-web-vitals`
- React and navigation: `vercel-react-best-practices`, `vercel-react-view-transitions`
- Review and verification: `accessibility`, `web-design-guidelines`, `web-quality-audit`, `playwright-cli`

Load only the skills relevant to the current task.

## MCP routing

- Context7: current GSAP, Lenis, Next.js, and browser-library documentation
- Next.js DevTools: inspect a running Next.js development server
- Playwright: interaction, responsive, keyboard, reduced-motion, screenshot, and regression checks
- Chrome DevTools: performance traces, network activity, console errors, layout shifts, and rendering bottlenecks

Use MCP tools when they materially improve evidence. Do not run both browser MCP servers for the same simple check.

## Verification

For animation changes, verify the smallest relevant set of desktop, touch, reduced-motion, keyboard, cleanup, and performance behavior. Report measured evidence instead of claiming smoothness by inspection alone.

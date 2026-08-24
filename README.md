# Saad — portfolio

Next.js (App Router) + TypeScript + CSS Modules + GSAP + Lenis.
The approved experience lives in `doc/moresimple.md`; motion ownership rules
live in `doc/MOTION_ARCHITECTURE.md`.

## Status

Hero section only. Work, Case Studies, Contact and Footer are not built yet.

## Run

```bash
npm install
```

```bash
npm run dev
```

## Hero person image

`public/media/hero-person.webp` (89 KB) is generated from
`media/newherotransparent.png` — cropped tight to the alpha bounds and resized
to 680×1560. If you replace the source, regenerate it and update `PERSON_W` /
`PERSON_H` in `src/components/hero/Hero.tsx` and the `aspect-ratio` in
`Hero.module.css` to match.

The Developer-mode dark clothing is a static CSS filter grade on a stacked copy
of the same file (`.personDark`); GSAP only crossfades its opacity.

## Hero motion

- **Entrance** — one local GSAP timeline. The person only fades; it never moves.
- **Designer ↔ Developer** — pointer-driven, `quickTo` setters on a ticker
  callback. Moves the split, the lighting, the card emphasis and the parallax
  layers. The person is deliberately excluded: it is the still centre.
- **Ambient loops** (`heroAmbient.ts`) — the code block types itself and
  backspaces, the terminal runs different job sets, the dashboard curve morphs
  between datasets with a marker riding the line, the type specimen cycles
  weight, the wireframe rebuilds, the Lighthouse scores re-measure, and SVG
  traces carry data down the developer side.

Every loop is created inside the `(prefers-reduced-motion: no-preference)`
`matchMedia` branch, so reduced motion gets a fully typed, completely static
composition.

## Files

| Path | Role |
| --- | --- |
| `src/lib/gsap.ts` | The only place GSAP plugins are registered |
| `src/components/SmoothScroll.tsx` | Lenis, desktop + fine pointer + normal motion only |
| `src/components/hero/Hero.tsx` | Hero composition and all hero motion |
| `src/components/hero/HeroCopy.tsx` | Left column: eyebrow, headline, lede, CTA, trust row |
| `src/components/hero/DesignCluster.tsx` | Designer-side cards |
| `src/components/hero/CodeCluster.tsx` | Developer-side code, terminal, Lighthouse card |
| `src/components/hero/Hero.module.css` | All hero layout and static styling |

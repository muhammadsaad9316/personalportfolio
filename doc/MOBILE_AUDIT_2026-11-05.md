# Mobile optimization audit — 5 November 2026

The site works well at ordinary mobile text sizes, but it is **not fully mobile optimized**. The responsive layouts and touch navigation pass. Remaining work is larger-text support, slower-device startup, and the liquid footer's initial frame cost. This was an audit; application code was not changed.

## Scope and method

- Built an isolated copy of the current working tree using the installed Next.js 15.5.23. Production build and an independent TypeScript check passed. Tested the production server at `http://127.0.0.1:3100`, rather than measuring development bundles.
- Checked `/`, `/work`, `/work/time-mardan`, `/work/miru-closet`, and `/work/danx-detailing` at 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, and 844×390: 35 route/viewport combinations. Every context used touch, a coarse pointer, mobile emulation, and DPR 2.
- Exercised CDP touch swipes, link/button taps, screenshot enlargement, history, orientation changes, keyboard focus, reduced motion, and JavaScript-disabled content.
- Measured four fresh-browser-cache loads at 390×844, CPU 4× slowdown, 1.6 Mbps download, 750 Kbps upload, and 150 ms emulated latency. The local server's generated image cache was already warm. Two runs were the home page; the others were the project index and one project detail page.
- Ran Lighthouse mobile accessibility, best-practices, and SEO audits. This tool does **not** calculate a performance score.
- Measured footer RAF intervals during sustained synthetic touch input, with CPU 4× slowdown. Compared the active effect with reduced motion and with its eventual static fallback. These are local lab results, not physical-phone GPU or field measurements.

## What passed

| Check | Result |
| --- | --- |
| Production build and TypeScript | Passed |
| Responsive route checks | 35/35 returned HTTP 200; no horizontal overflow or runtime errors |
| Visible links and buttons | No measured target below 44×44 CSS px in the 35 layouts |
| Touch reading | Native down/up swipes changed scroll by +385.33/−385.33 px |
| Navigation | Work CTA, project card, footer Contact/Case Studies, history return, and Back to top passed |
| Case studies | Three readable stacked chapters; no desktop sticky composition on touch |
| Product screenshots | All three lazy images loaded when scrolled into view; full-resolution screenshot link opened successfully |
| Reduced motion | Three chapters remain visible; liquid filter removed; footer state is `reduced-motion` |
| No JavaScript | Chapters and Contact visible; no horizontal overflow |
| Offscreen hero | Zero observed DOM mutations over 700 ms |
| Initial visual stability | CLS 0 in all four throttled loading samples |
| Mobile Lighthouse | Accessibility 100, best practices 100, SEO 100; 55 audits passed, zero failed |
| Orientation and keyboard | Landscape navigation stayed visible; keyboard focus had a solid outline |

The broad text-range detector reported vertical font-box intersections with the hero's authored line masks at default size. Screenshot inspection did not show missing glyphs there; those geometry warnings are not counted as defects. Enlarged text produced a separate, visible failure below.

## Findings, in priority order

### 1. High: the hero loses content with larger text

At 390×844, setting the root font size to 200% makes the hero headline extend to x=472.45 px. The viewport ends at 390 px. The words “experiences” and “solid products.” are visibly cut off. The document still reports no horizontal overflow because the surrounding masks hide it. Supporting copy also extends onto the dark portrait background and loses contrast.

The relevant rules are the fixed, non-wrapping lines in [Hero.module.css](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/hero/Hero.module.css:257), the mobile minimum font size in [the same stylesheet](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/hero/Hero.module.css:750), and the percentage-positioned dark ground at line 705. The 200% test changed root font size to simulate larger-text preferences; it was not a physical device's OS text-size test.

**Smallest fix:** let headline lines wrap in the native mobile composition and let their masks grow with the text. Make the portrait's dark ground follow its own layout area so expanded copy stays on the light surface. Retain the existing desktop animation owners. Verify at 320/390 px with 100%, 150%, and 200% text.

[Screenshot showing the clipping](C:/Users/SAAD/Desktop/PersonalPortfoliosite/.shots/mobile-audit-2026-11-05/text200-390.png). [W3C's resize-text guidance](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) explains the requirement to preserve content when text grows.

### 2. High: slower-device startup misses the good loading target

| Route/run | Largest Contentful Paint | JavaScript transfer | All subresource transfer | Startup long-task excess |
| --- | --- | --- | --- | --- |
| Home 1 | 2.856 s | 194.8 KiB | 388.9 KiB | 1087 ms |
| Home 2 | 4.864 s | 194.8 KiB | 388.9 KiB | 1721 ms |
| Project index | 3.088 s | 108.9 KiB | 257.1 KiB | 1451 ms |
| Time Mardan detail | 1.532 s | 101.7 KiB | 205.3 KiB | 657 ms |

Google's good LCP threshold is 2.5 seconds. Both home samples and the index sample exceeded it. The hero portrait was the home LCP element. Local document TTFB was only 6.8–9.2 ms, so these measurements do not include realistic hosting latency. Transfer figures exclude the HTML document; each home document added 12.8 KiB. Startup long-task excess is the sum of task time beyond 50 ms, not Lighthouse TBT or INP.

Images already have useful mobile handling: home fetched one 480px portrait at quality 75 (45.9 KiB) and one branch screenshot (29 KiB). Later chapter screenshots were not eagerly downloaded. Fonts still contributed 105.9 KiB to the home page. The build reports 196 kB first-load JavaScript for home versus 109 kB for the project routes.

**Next fix to investigate:** profile and split desktop-only motion initialization out of the initial mobile bundle, preserving the native content. [Experience.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/experience/Experience.tsx:3) statically imports the animated sections/controllers, while [gsap.ts](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/lib/gsap.ts:8) statically imports GSAP and its desktop plugins. Media queries prevent desktop motion from running, but do not by themselves remove those imports from the download. This is an optimization candidate, not proof that every measured millisecond comes from GSAP. Profile the project index separately and review unused preloaded font variants. Re-measure after each change.

The variation between home runs is material. These samples show that the current local slow-device scenario is not consistently fast; they do not establish a quantified regression against the October audit. [Google's Core Web Vitals thresholds](https://support.google.com/webmasters/answer/9205520?hl=en) provide the reference targets.

### 3. Medium: the liquid footer stutters before its fallback settles

The first 3.2-second touch-input sample at CPU 4× had p95 RAF intervals of 83.4 ms, a worst interval of 200 ms, and 14/134 intervals above 32 ms. It fell from economy to low quality, then to `budget-fallback` after 39 simulation frames.

A second comparison confirmed the distinction:

- Reduced motion/static: p95 16.8 ms, 1/210 intervals above 32 ms.
- Liquid enabled: p95 33.4 ms, worst 100 ms, 24/178 intervals above 32 ms.
- After the fallback activated in that run: p95 16.9 ms, zero of 120 intervals above 32 ms.

The fallback works and restores a steady static surface, but visitors can experience several poor frames first. Native scrolling remained available during footer interaction. The quality window and fallback logic live in [FooterFluid.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/footer/FooterFluid.tsx:115).

**Smallest fix to test:** start touch rendering at a lower cost, or let repeated severe frame misses select the static fallback sooner. Keep the effect's approved visual identity on capable hardware. Re-measure on an actual midrange Android phone and an iPhone; CPU throttling does not emulate their GPUs.

## Remaining verification and launch inputs

- Physical Android/iPhone, iOS Safari, Firefox, browser chrome/safe-area behavior, and real OS text-size settings were not tested.
- Field INP and the deployed site's CDN/network behavior were not measured. Lighthouse's 100 accessibility score does not cover the manual enlarged-text failure.
- A synthetic pinch command left `visualViewport.scale` at 1 on both the site and a plain control page. That harness cannot verify pinch zoom here; this is not evidence that the site blocks it. The viewport declaration has no zoom restriction.
- The footer grows to 573.85 px on a 568px-tall small phone, and 666.31 px in 844×390 landscape. Its content is readable and scrollable, but the approved one-viewport footer target is not met in those two sizes. Preserve full touch targets if tightening it.
- Contact/social settings still use explicit placeholders in the unconfigured local build, as documented in [siteLinks.ts](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/contact/siteLinks.ts:13). This is a separate launch configuration gap, not a mobile layout defect.

## Evidence

Audit scripts, machine-readable results, screenshots, and the Lighthouse HTML/JSON reports are under [the audit artifact folder](C:/Users/SAAD/Desktop/PersonalPortfoliosite/.shots/mobile-audit-2026-11-05). In particular: `layout-results.json`, `loading-results.json`, `interaction-results.json`, `footer-results.json`, `footer-comparison.json`, and `lighthouse.html`. This folder is ignored by Git. The isolated production copy is disposable; preserve the evidence files.

Fix the enlarged-text layout and the slow-device startup first, then reduce the footer's initial rendering cost. Ordinary mobile layouts and navigation are already in good shape.

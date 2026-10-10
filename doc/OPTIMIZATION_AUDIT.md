# Portfolio optimization audit — 9 October 2026

**Implementation follow-up:** the user subsequently authorized implementation.
The comparison at the end of this report records completed changes and current
verification. The original audit below remains the baseline, including its
historical source line numbers and recommendations.

The site already adapts successfully to phones and tablets. The largest measured opportunities are faster mobile startup, stopping invisible animation work, and making the liquid footer adapt sooner to slower hardware. The desktop transitions performed well in the tested production build. Application code was not changed during this audit.

The user requested recommendations only. The findings below are an implementation backlog, not completed optimizations. Preserve the approved visual direction and the property owners in `doc/MOTION_ARCHITECTURE.md` when implementing them.

**Scope and method**

- Inspected all application routes, layout/styles, images/fonts, animation initialization, stage navigation, and the footer solver.
- Built an isolated production copy with the installed Next.js 15.5.23 and React 19.1.1; served it on localhost:3100. The existing development server and its build directory were left alone.
- Checked `/`, `/work`, `/work/time-mardan`, `/work/miru-closet`, and `/work/danx-detailing` at 320×568, 390×844, 768×1024, 1024×768, and 844×390, with explicit touch/coarse-pointer emulation. Reviewed section screenshots and a full project-list screenshot.
- Measured cold browser loading at 390×844, DPR 2, CPU 4× slowdown, approximately 1.6 Mbps download, 750 Kbps upload, and 150 ms latency. Two mobile runs used fresh browser caches; the second reused the server's generated image cache. Also measured an unthrottled 1440×900 desktop load.
- Recorded requestAnimationFrame intervals during desktop transitions and footer interaction, and during touch interaction with and without CPU throttling. These are browser frame intervals, not a physical-phone GPU benchmark.
- Ran Chrome performance insights and mobile Lighthouse accessibility, best-practices, and SEO checks. This Lighthouse tool does not provide a performance score.
- Exercised keyboard/stage navigation, history/reload, reduced-motion changes, native touch scrolling, WebGL failure/restoration, and footer route unmount/remount.

All measurements are local lab observations. The GPU was an Intel Iris Xe through ANGLE/D3D11. CPU throttling and a phone viewport do not emulate an Android or iPhone GPU. Hosted response times, CDN behavior, physical-device Safari/Android performance, and real-user INP were not measured.

**Measured results**

| Check | Result | Meaning |
| --- | --- | --- |
| Production build | Passed; all five routes statically generated | No build blocker |
| Responsive route checks | 25/25 returned 200; no horizontal overflow, detected clipped text, or runtime errors | Existing responsive structure works |
| Desktop initial LCP | 0.684 s | Fast on this unthrottled machine |
| Mobile initial LCP, fresh browser cache | 3.752 s and 4.532 s | Mobile startup needs work |
| Separate Chrome mobile loading trace | LCP 4.864 s; 4.229 s element render delay | A cached image can still wait a long time to become visible |
| Initial-load layout-shift sum | Desktop 0.0014; mobile 0.0042 | Very little initial layout movement |
| Initial subresource transfer | Desktop 801 KiB; mobile 508 KiB | Excludes the HTML document; not total site asset size |
| Mobile transferred JavaScript/images/fonts | 201.5 / 187.3 / 105.9 KiB | Mobile receives the same initial JS amount as desktop |
| Mobile startup long-task excess | 780–1010 ms across 4–5 long tasks | Sum of task time beyond 50 ms; not Lighthouse TBT or INP |
| Desktop Hero→Work / Work→Cases / chapter p95 intervals | 16.9 / 16.9 / 16.8 ms | Approximately a 60 Hz cadence in these samples |
| Desktop footer p95 | 16.9 ms; 1/210 intervals over 32 ms | Good on this GPU |
| Touch footer, CPU 4× | p95 33.4 ms; worst 50 ms; 58/193 intervals over 32 ms | About 30% of intervals missed the 32 ms threshold |
| Offscreen mobile hero | 896 DOM mutations in one second while the hero was far above the viewport | Invisible animation work continues |
| Lighthouse mobile home | Accessibility 96; best practices 100; SEO 100 | These scores do not establish animation performance or launch completeness |

The separate loading trace also reported 935 ms of forced reflow time. Its call stacks include GSAP computed-style/transform/SVG-bounds initialization and ScrollTrigger registration. One layout update took 636 ms with 521 nodes needing layout. The DOM had 579 elements in that trace; a large component rewrite based solely on DOM count is not justified. Reduce unnecessary initialization and repeated layout measurement first. The trace supports the bottleneck; it does not establish how much time any proposed fix will save.

**Recommendations, in implementation order**

1. **Make the mobile headline and portrait visible immediately, then initialize decorative motion. High impact.**

   The final mobile LCP element was the portrait. Its image finished loading around 2.8 seconds in the fresh-cache runs, but it became the LCP at 3.75–4.53 seconds. The entrance in [Hero.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/hero/Hero.tsx:98) hides the portrait, then fades it for 1.5 seconds after animation initialization. The separate cached-resource trace still spent 4.229 seconds in render delay. JavaScript startup, layout work, and the reveal are all relevant; compressing the image alone cannot remove the render delay.

   Render meaningful mobile content in its final readable state from the server. Keep the cinematic entrance on suitable desktop hardware, and animate secondary decoration after the primary content can paint. Give the existing LCP image explicit high fetch priority while reducing competing image preloads. Retest LCP, including fresh-cache and cached loads; do not merely shorten a timeline and assume the problem is solved. [Chrome's LCP breakdown](https://developer.chrome.com/docs/performance/insights/lcp-breakdown) explains why resource loading and element rendering must be measured separately.

2. **Stop constructing and running hero animations that are hidden or offscreen. High impact.**

   [Hero.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/hero/Hero.tsx:160) creates ambient code, chart, wire, type, signal, and pulse loops for every normal-motion device. Several designer elements are hidden by responsive CSS, but their loop setup still runs. The mobile native-scroll branch does not pause the hero after it leaves the viewport. At the footer, an observer counted 896 mutations in one second inside the invisible hero; another throttled sample counted 1110, with a different animation phase.

   Use viewport intersection plus page visibility to pause/resume the existing ambient animations. Do not initialize loops for elements excluded from the current composition. A narrow touch composition can retain a few visible details without running the desktop designer dashboard. Measure before/after startup layout cost and offscreen activity. The existing desktop handoff's `setAmbient` behavior must remain coordinated with this visibility gate. Avoid two owners fighting over the same animations.

   The trace includes costly hidden SVG bounds initialization. Separating geometry reads from writes and constructing only the needed composition are concrete candidates to test. GSAP is not being replaced. [Chrome's forced-reflow guidance](https://developer.chrome.com/docs/performance/insights/forced-reflow) describes the read-after-write cost.

3. **Remove hidden and duplicate image requests on phones. High impact, relatively small scope.**

   The initial phone load fetched three desktop gallery screenshots despite that gallery having zero-size image boxes. It also fetched the branch overview twice, with quality 88 and quality 75. The hidden arrival/expenses requests plus the additional first-image variant account for roughly 56 KiB of avoidable transfer in this test.

   [CaseStudies.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/cases/CaseStudies.tsx:486) keeps both gallery and mobile figure trees, uses eager loading for later desktop slides, and gives the first mobile figure priority. [ProjectPreview.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/work/ProjectPreview.tsx:26) also prioritizes the below-the-fold flagship preview.

   Use a responsive image/source strategy that prevents eager requests for the inactive composition. Lazy-load below-the-fold mobile figures; align size/quality variants where the same screenshot should be reused. Reserve initial priority for content actually visible on arrival. Preserve the shared Work→Cases image and preload the next desktop chapter near its use, so reducing requests does not reintroduce blank transitions. Display:none alone does not cancel eager image loading.

   The mobile portrait request was about 102 KiB at a 640-pixel variant, with a 231 CSS-pixel display width at DPR 2. Evaluate a closer size variant and lower mobile quality by comparing face detail. Keep the full desktop derivative required by the 9.5× hero zoom. [Next.js 15 image documentation](https://nextjs.org/docs/15/app/api-reference/components/image) covers sizes, priority, and loading behavior.

4. **Make the liquid footer adapt to missed frames sooner. High impact on weaker devices.**

   The original footer content visibly deforms, and its fallbacks work. The expensive path is [FooterFluid.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/footer/FooterFluid.tsx:113) and [footerFluidSolver.ts](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/footer/footerFluidSolver.ts:380): GPU field → completed pixel-buffer readback → CPU pixels → PNG data URL → SVG displacement filter applied to the DOM content. This is done during every active animation frame. The solver already uses asynchronous fences and bounded buffers; simply recommending asynchronous readback would repeat work already implemented.

   Try updating the displacement image at a lower rate on touch devices while preserving a coherent simulation, lowering map resolution, and reducing the filtered paint area. Use missed-frame proportion or high-percentile frame intervals to trigger economy mode. The current average-over-24-ms detector did not enter economy mode in the sample with 58/193 intervals above 32 ms. Lowering simulation resolution alone also leaves the map/DOM-filter cost largely intact.

   Keep the effect on capable devices, with a quicker settle and a static fallback when the measured budget remains poor. Avoid relying solely on device names or hardware hints. Benchmark the interaction and native scrolling together on real phones. The WebGL initialization is already visibility gated; preserve its offscreen, idle, focus, reduced-motion, failure, and cleanup behavior.

5. **Defer footer solver code and desktop-only startup work. Medium impact; measure the saving.**

   The home route transferred approximately 201.5 KiB of JavaScript in both desktop and phone tests. [FooterFluid.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/footer/FooterFluid.tsx:4) imports its solver immediately even though GPU creation waits for visibility. Load the decorative effect/solver near the footer rather than placing it on the initial critical path. Keep real footer text and links server rendered.

   [Experience.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/experience/Experience.tsx:1) makes the entire experience a client import tree, and [SmoothScroll.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/SmoothScroll.tsx:25) imports Lenis/GSAP from the shared root layout even when smoothing is disabled. Consider splitting desktop-specific setup from the native touch composition and narrowing static content's client boundaries. This should be incremental; the measured loading/initialization fixes above take precedence over a broad rewrite. [Next.js lazy-loading guidance](https://nextjs.org/docs/app/guides/lazy-loading) supports deferring optional client code while retaining server content.

6. **Recover from arbitrary scroll positions and failed JavaScript initialization. Reliability priority.**

   At 1440×900, opening Work settled at y=900. Moving to y=1350, equivalent to landing between stage stops with the scrollbar, then scrolling upward left the page at 1350 with the hero hidden and Lenis stopped. Normal wheel/keyboard stepping and registered links passed. The arbitrary-position recovery gap is already recorded in `doc/WORK_TO_CASES.md`.

   Synchronize stage state with actual scroll position, settle an arbitrary position to a valid beat, and provide a way to release the held stage. Preserve the existing ownership and history behavior. Also preserve the current reading section when changing motion mode: switching from reduced motion to cinematic mode at the footer returned the viewport to the hero in this audit; the footer tests explicitly scrolled back after that mode change.

   With JavaScript disabled on desktop, Hero, Work, and the case introduction remained visible, but solution/result, Ending, Contact, and footer columns were hidden. The hero has a noscript override; the whole stage does not. Make normal document flow the readable baseline and apply hidden/pinned cinematic styles only after successful setup. Include a fail-open cleanup path for interrupted initialization, not only a noscript rule. A loading failure should still leave portfolio content and contact navigation available.

7. **Make a few targeted mobile usability refinements. Lower priority than the performance fixes.**

   The mobile hero measured about 1069 px high at 320×568 and 1185 px at 390×844. Its title and CTA are readable; there is no demonstrated overflow. Consider shortening or calming the secondary code decoration so visitors reach Work sooner. Keep the approved typography and portrait identity.

   Dense ERP screenshots fit the page but their interface text is tiny. Offer a keyboard-accessible tap-to-enlarge view or a focused crop where understanding the product requires detail. Retain the full screenshot as accessible context. At the 1024-pixel touch viewport, the hero Work link measured 33×44 px; increasing its horizontal hit area to at least 44 px would make it easier to tap. Most other navigation/action targets already met that size in these checks.

8. **Fix the footer landmark and finish launch content. Small, clear tasks.**

   Lighthouse's accessibility failure points to `body > main#main > footer#footer`: its aria-label is prohibited because the footer is inside main and does not expose the global footer landmark. [page.tsx](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/app/page.tsx:11) renders SiteFooter inside main. Render the site footer after main as a sibling, then rerun accessibility and stage/footer geometry checks.

   [siteLinks.ts](C:/Users/SAAD/Desktop/PersonalPortfoliosite/src/components/contact/siteLinks.ts:11) still has placeholder email, GitHub, and LinkedIn destinations. Root metadata has a title/description, but no verified production canonical/social preview or sitemap/robots routes. Use the real contact details and deployed origin when available. Lighthouse SEO 100 does not mean these launch tasks are complete.

**What already works and should be preserved**

The static routes build successfully. Responsive text and page widths passed all tested touch sizes, including small portrait and landscape. Native mobile scrolling is retained. Fonts are locally served through next/font; images reserve their dimensions, and initial layout shift is low. The existing stage navigation test passed direct links, reload/cross-page history, fragment history, keyboard stepping, footer return, and reduced-motion teardown. The case study contains exactly intro, solution, and result.

The footer's production checks verified visible content deformation, unchanged link/button layout boxes (maximum measured delta 0 px), keyboard order and Back to top, idle/offscreen pause, live reduced-motion fallback, WebGL context loss/restoration, unsupported-WebGL fallback, route disposal/remount without duplicate canvases, and keyboard links to Work/Cases/Contact. A native touch swipe moved the page 78 px while the liquid effect ran; touch Back to top returned to y=1. No browser runtime errors were recorded. The test explicitly repositions the footer after enabling cinematic mode because of the scroll-position issue described above. Hidden-tab behavior is implemented in source but was not separately exercised in the production runtime checks.

**Acceptance before calling the optimized version ready**

Use the current production measurements as the baseline. Implement items 1–4 first, then compare identical fresh-cache loading and interaction samples. Target real-user LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.1 at the 75th percentile, evaluated separately for mobile and desktop. These are the [Core Web Vitals thresholds](https://web.dev/articles/vitals); INP has not been measured by this audit.

For the 60 Hz motion target, agree on a frame budget near 16.7 ms and a low missed-frame rate during the footer effect and both major handoffs. Keep ordinary mobile scrolling responsive even when an optional effect falls back to static. Test a midrange Android phone, iPhone Safari, rotation, browser address-bar changes, return navigation, keyboard, reduced motion, and a slow connection on the deployed build. Collect real-user vitals after launch to catch conditions that desktop emulation cannot reproduce. No site can guarantee zero lag on every device, but it can keep optional effects within a measured budget and preserve usability when that budget cannot be met.

Raw local evidence and audit scripts are retained in `.shots/audit-layout-results.txt`, `.shots/audit-loading-results.txt`, `.shots/audit-runtime-results.txt`, and `.shots/audit-footer-check-output.txt`. These are ignored temporary artifacts; this report records the durable findings.

## Implementation comparison — 9 October 2026

Implemented the priority loading, mobile animation, image and footer-budget fixes,
plus targeted navigation, fallback, accessibility and launch-readiness changes.
The approved desktop choreography, fonts, portrait identity and three case-study
chapters are retained. No new runtime dependencies were added.

| Comparable local measurement | Audit baseline | Optimized implementation |
| --- | --- | --- |
| Fresh-browser mobile LCP, CPU 4× / 1.6 Mbps | 3.752–4.532s | 1.556–1.576s |
| Mobile initial subresources, excluding HTML | 507.7 KiB | 387.7 KiB (24% lower) |
| Mobile JavaScript / image / font transfer | 201.5 / 187.3 / 105.9 KiB | 193.6 / 74.9 / 105.9 KiB |
| Mobile startup long-task excess | 780–1010ms | 211–279ms |
| Mobile initial layout-shift sum | 0.0042 | 0.00030 |
| Unthrottled desktop LCP | 0.684s | 0.292s |
| Desktop handoff/chapter p95 frame intervals | 16.8–16.9ms | 16.8–17ms; zero to one intervals over 32ms per sample |
| CPU 4× touch footer p95 | 33.4ms; 58/193 intervals over 32ms | 16.8ms; 0/224 over 32ms (earlier optimized sample: 18.1ms) |
| Offscreen mobile hero mutations | 896/second | Zero in both 800ms and 1s samples |
| Mobile Lighthouse accessibility / best practices / SEO | 96 / 100 / 100 | 100 / 100 / 100; 55 passed, zero failed in the final audit |

The loading tests used fresh browser caches, explicit 390×844 coarse-pointer
emulation at DPR 2, 150ms latency and CPU 4× slowdown, against a local production
server with generated image variants already warmed. Subresource transfer excludes
HTML. Startup excess is the sum of long-task durations above 50ms; it is neither
Lighthouse TBT nor INP. Frame intervals came from Windows Chrome on Intel Iris Xe
through ANGLE/D3D11. CPU throttling does not reproduce a phone GPU or Safari.
Lighthouse here audits accessibility, best practices and SEO, not performance.

Implemented behavior:

- **Immediate native mobile content.** Hero/Work/footer entrances and Work SVG
  interaction setup run only in the cinematic desktop composition. Mobile hero
  decoration is static and its code preview is capped at 185px. Designer SVG loops
  are omitted when that layer is hidden. Desktop hero ambient activity requires
  both handoff permission and viewport/document visibility. GSAP alone owns the
  entrance transforms; CSS only guards initial opacity.
- **Responsive image requests.** The phone portrait selects one 480px quality-75
  derivative at the tested DPR, while desktop keeps its quality-88 zoom source.
  Media-gated gallery sources avoid hidden mobile arrival/expense downloads.
  Shared overview variants use matching quality. Mobile figures and the Work
  preview lazy-load. All three native chapter figures offer a full screenshot link
  with a visible-label-matching accessible name and new-tab information.
- **Bounded footer work.** The solver imports only when the footer is visible
  and allowed. Touch starts in economy mode: 96×208 field and 22×48 displacement
  map at the tested phone size, with 30Hz map updates and a 2.6s settle window.
  Missed-frame windows reduce quality; persistently poor budgets choose a static
  surface. `scripts/footer-budget-check.js` adds 27ms of competing work per animation frame:
  the effect reached low quality then budget fallback,
  stopped rendering, removed the filter, and retained Contact navigation. This
  injected-load test verifies fallback behavior rather than device performance.
  A repeated full-quality desktop sample reached p95 33.3ms with 12/209 intervals
  over 32ms, after an earlier 16.9ms sample. The detector was tightened to react to
  two intervals above 25ms in each window, capped at 30 frames or 500ms of active
  time, so smaller clusters reduce work and severely slow rendering cannot postpone
  fallback for many seconds. Other sessions produced CPU 4× p95 samples of
  182.5–266.5ms while an animated harness page also shared the browser. The final
  controlled run put the harness on the static `/work` route: desktop p95 16.9ms,
  CPU 4× touch p95 16.8ms, zero intervals over 32ms in both. The precise cause of
  the earlier variation was not isolated. Physical-device acceptance remains
  necessary; one favorable run cannot establish universal smoothness.
- **Reliable document and stage navigation.** Normal document flow is the CSS
  baseline. Work activates `data-cinematic` before stage measurement and removes
  it on teardown. No-JavaScript desktop shows ordered, nonoverlapping chapters,
  screenshot figures, Ending, Contact and footer. The stage restores arbitrary
  positions to the nearest logical rest after 120ms without interfering with
  active handoffs. Motion-mode changes preserve the current reading section.
  Lenis is dynamically loaded only on the eligible home-page desktop composition.
- **Accessibility and launch configuration.** The global footer sits after main.
  Hero Work and keyboard skip links have 44px minimum targets. Environment settings
  supply contact/profile URLs and the deployed origin. Canonicals and social
  preview metadata are route-specific; robots, sitemap and a 1200×630 social image
  are available. Unknown origins omit canonical/image URLs and sitemap entries.

Verification:

- Production build and TypeScript checks pass; existing project routes return 200
  and an unknown slug returns 404.
- Five routes × five explicit touch sizes (320×568, 390×844, 768×1024, 1024×768,
  844×390) pass without horizontal overflow, detected clipped text or runtime
  errors. Hero/case/footer screenshots and the social image were visually checked.
- `scripts/stage-navigation-check.js` passes direct links, chapter reload,
  cross-page/fragment history, stale-hash navigation, keyboard and reduced-motion
  cleanup. `scripts/optimization-check.js` adds five arbitrary-rest recoveries,
  live motion-mode reading restoration, image-request policy, zero offscreen
  mobile hero changes, full screenshot links and no-JavaScript content order.
- `scripts/footer-fluid-check.js` passes original-content deformation, 0px hitbox
  changes, keyboard order/routes and Back to top, touch scrolling (100px moved),
  idle/offscreen stop, live reduced-motion/static keyboard behavior, WebGL loss and
  restoration, unsupported fallback, route disposal/remount and no runtime errors.
- A desktop resize from 1440×900 to 1440×800 at the case landing restores y=1600
  and the following keyboard step reaches y=2400; navigation remains usable.
- Configured/unknown-origin metadata, deployment-origin fallback and invalid URL
  protocol checks pass. Local robots/sitemap/image endpoints return 200; the
  unconfigured sitemap deliberately has no production URLs.

Remaining launch inputs and acceptance:

Real email, GitHub URL, LinkedIn URL and production website URL were requested but
have not been supplied. Copy `.env.example` to `.env.local` for local builds, or
set its variables in hosting settings before building. Placeholder contact/profile
destinations remain until those values are provided; no actual deployment was made.
The social image is generated and visually checked but only attached to metadata
when a real origin is configured.

Verify physical midrange Android and iPhone Safari, rotation/address-bar changes,
hidden-tab behavior, deployed CDN/cache behavior and real-user vitals after launch.
INP remains unmeasured. These measured improvements address the demonstrated
bottlenecks; they do not establish zero lag on every device.

Implementation evidence is retained in ignored `.shots/final-loading.json`,
`.shots/final-runtime.json`, `.shots/final-layout.json`,
`.shots/final-lighthouse-report.json`, `.shots/final-footer-check-output.txt`,
`.shots/final-budget-check-output.txt` and the navigation/optimization/project
check outputs. The `.prd` and motion documents record the current handoff.
Repeat footer samples, including the slower observations, remain in
`.shots/final-desktop-runtime-results.txt`, `.shots/final-footer-runtime-results.txt`,
`.shots/clean-footer-runtime-results.txt` and `.shots/bounded-footer-runtime.json`.

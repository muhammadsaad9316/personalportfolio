"use client";

import Image from "next/image";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import HeroCopy from "./HeroCopy";
import DesignCluster from "./DesignCluster";
import CodeCluster from "./CodeCluster";
import {
  caretBlink,
  chartLoop,
  codeTypingLoop,
  dotSweepLoop,
  pulseLoop,
  seamLoop,
  signalLoop,
  typeSpecLoop,
  wireLoop,
} from "./heroAmbient";
import styles from "./Hero.module.css";

const PERSON_SRC = "/media/hero-person.webp";
/* The Hero -> Work transition magnifies this figure several times over, so
   desktop must download the full-resolution file even though it is laid out
   small. Touch never runs the transition and keeps a sensible variant. */
const PERSON_SIZES = "(max-width: 899px) 66vw, 1300px";
const PERSON_W = 1300;
const PERSON_H = 2984;

const NAV = [
  { label: "Work", href: "#work", current: true },
  { label: "About", href: "#about", current: false },
  { label: "Skills", href: "#skills", current: false },
  { label: "Notes", href: "#notes", current: false },
];

/** Circuit traces behind the developer side. */
const SIGNALS = [
  "M170 152 H322 L372 202 H620",
  "M620 322 H472 L422 272 H250",
  "M212 -20 V122 L272 182 V418",
  "M544 782 H402 L352 732 H192",
  "M332 920 V702 L392 642 V432",
  "M620 566 H522 L472 616 H302",
];

export type HeroHandle = {
  /** Park or resume the ambient layer. The code typing, chart, traces and
   *  counters hold no meaningful state, so pausing them while the visitor is
   *  in Work saves work and stops the return reading as a replay. */
  setAmbient: (active: boolean) => void;
};

const Hero = forwardRef<HeroHandle>(function Hero(_props, ref) {
  const rootRef = useRef<HTMLElement>(null);
  const personRevealRef = useRef<HTMLDivElement>(null);
  const personDarkRef = useRef<HTMLDivElement>(null);
  const darkPanelRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<gsap.core.Animation[]>([]);

  useImperativeHandle(ref, () => ({
    setAmbient: (active: boolean) => {
      for (const item of ambientRef.current) {
        if (active) item.resume();
        else item.pause();
      }
    },
  }));

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const q = gsap.utils.selector(root);
      const layers = Array.from(
        root.querySelectorAll<HTMLElement>("[data-depth]"),
      );
      const mm = gsap.matchMedia();

      /* ---------------------------------------------------------------
       * Reduced motion — final readable state, nothing animates or loops.
       * ------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          [
            q("[data-reveal]"),
            q("[data-line]"),
            q("[data-gutter]"),
            personRevealRef.current,
          ],
          { autoAlpha: 1, x: 0, y: 0, yPercent: 0, scale: 1 },
        );
        gsap.set(darkPanelRef.current, { x: 0, xPercent: 0 });
        gsap.set(q("[data-caret]"), { autoAlpha: 0 });
      });

      /* ---------------------------------------------------------------
       * Entrance choreography — one local timeline, no ScrollTrigger.
       * ------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // CSS supplies the first-paint from-state as a percentage transform.
        // GSAP reads that back as pixels, so zero x/y here or the percent
        // tween would finish on top of a leftover pixel offset.
        gsap.set(darkPanelRef.current, { x: 0, xPercent: 100 });
        gsap.set(q("[data-line]"), { y: 0, yPercent: 118 });
        gsap.set(q("[data-reveal='nav']"), { y: -14, autoAlpha: 0 });
        gsap.set(q("[data-reveal='copy']"), { y: 20, autoAlpha: 0 });
        gsap.set(q("[data-reveal='card']"), { y: 26, scale: 0.965, autoAlpha: 0 });
        gsap.set(q("[data-reveal='code']"), { autoAlpha: 0 });
        gsap.set(q("[data-gutter]"), { autoAlpha: 0.3 });
        // The person only fades. It never moves — not on entrance, not on
        // pointer. It is the fixed anchor of the composition.
        gsap.set(personRevealRef.current, { autoAlpha: 0 });

        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .addLabel("open", 0)
          .to(
            darkPanelRef.current,
            { xPercent: 0, duration: 1.2, ease: "power4.inOut" },
            "open",
          )
          .to(
            personRevealRef.current,
            { autoAlpha: 1, duration: 1.5, ease: "power2.out" },
            "open+=0.25",
          )
          .to(
            q("[data-reveal='nav']"),
            { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05 },
            "open+=0.3",
          )
          .addLabel("copy", 0.42)
          .to(
            q("[data-line]"),
            { yPercent: 0, duration: 1, stagger: 0.07, ease: "power4.out" },
            "copy",
          )
          .to(
            q("[data-reveal='copy']"),
            { y: 0, autoAlpha: 1, duration: 0.75, stagger: 0.08 },
            "copy+=0.34",
          )
          .addLabel("artefacts", 0.62)
          .to(
            q("[data-reveal='card']"),
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.9, stagger: 0.09 },
            "artefacts",
          )
          .to(
            q("[data-reveal='code']"),
            { autoAlpha: 1, duration: 0.5 },
            "artefacts",
          );

        /* -------------------------------------------------------------
         * Ambient systems. The composition keeps working after the
         * entrance lands: the code writes itself, the dashboard
         * re-measures, and the traces carry data.
         * ----------------------------------------------------------- */
        const caret = root.querySelector<HTMLElement>("[data-caret]");
        const ambient: gsap.core.Animation[] = [];
        ambientRef.current = ambient;

        gsap.delayedCall(1.15, () => {
          ambient.push(
            ...codeTypingLoop(
              Array.from(root.querySelectorAll<HTMLElement>("[data-token]")),
              caret,
              Array.from(root.querySelectorAll<HTMLElement>("[data-gutter]")),
            ),
            ...caretBlink(caret),
          );
        });

        ambient.push(
          ...chartLoop(
            root.querySelector<SVGPathElement>("[data-chart]"),
            root.querySelector<SVGCircleElement>("[data-chart-marker]"),
            root.querySelector<HTMLElement>("[data-metric]"),
          ),
          ...wireLoop(q("[data-wire-bar]")),
          ...typeSpecLoop(
            root.querySelector<HTMLElement>("[data-type-sample]"),
            root.querySelector<HTMLElement>("[data-type-label]"),
            root.querySelector<HTMLElement>("[data-swatch-ring]"),
            Array.from(root.querySelectorAll<HTMLElement>("[data-swatch]")),
          ),
          ...signalLoop(
            Array.from(root.querySelectorAll<SVGPathElement>("[data-signal]")),
          ),
          ...dotSweepLoop(root.querySelector<HTMLElement>("[data-dot-sweep]")),
          ...seamLoop(root.querySelector<HTMLElement>("[data-seam]")),
          ...pulseLoop(
            Array.from(root.querySelectorAll<HTMLElement>("[data-live-dot]")),
          ),
        );
      });

      /* ---------------------------------------------------------------
       * Designer <-> Developer transformation.
       * Fine pointer only. Pointer values never enter React state.
       * ------------------------------------------------------------- */
      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const D = 0.75; // the brief asks for a 0.5–0.8s transformation
          const ease = "power3.out";
          const clamp01 = gsap.utils.clamp(0, 1);

          const parts = layers.map((el) => ({
            depth: Number(el.dataset.depth) || 1,
            quiet: Number(el.dataset.quiet ?? "0.55"),
            isCode: el.dataset.side === "code",
            x: gsap.quickTo(el, "x", { duration: D, ease }),
            y: gsap.quickTo(el, "y", { duration: D, ease }),
            opacity: gsap.quickTo(el, "opacity", {
              duration: 0.6,
              ease: "power2.out",
            }),
            scaleX: gsap.quickTo(el, "scaleX", { duration: D, ease }),
            scaleY: gsap.quickTo(el, "scaleY", { duration: D, ease }),
          }));

          const personDark = gsap.quickTo(personDarkRef.current, "opacity", {
            duration: 0.7,
            ease: "power2.out",
          });
          const panelX = gsap.quickTo(darkPanelRef.current, "x", {
            duration: 1,
            ease,
          });
          const glow = gsap.quickTo(glowRef.current, "opacity", {
            duration: 0.7,
            ease: "power2.out",
          });
          const grid = gsap.quickTo(gridRef.current, "opacity", {
            duration: 0.7,
            ease: "power2.out",
          });

          let nx = 0;
          let ny = 0;
          let dirty = false;

          const apply = () => {
            if (!dirty) return;
            dirty = false;

            // -1 = full Designer, 0 = balanced, +1 = full Developer.
            const designer = clamp01((-nx - 0.06) / 0.62);
            const developer = clamp01((nx - 0.06) / 0.62);

            panelX(-nx * 64);
            glow(designer);
            grid(developer);
            // The lighting on the person changes; the person does not move.
            personDark(developer * 0.92);

            for (const p of parts) {
              p.x(nx * p.depth * 24);
              p.y(ny * p.depth * 15);
              const fade = p.isCode ? designer : developer;
              const lift = p.isCode ? developer : designer;
              p.opacity(1 - p.quiet * fade);
              const scale = 1 + p.quiet * 0.06 * lift;
              p.scaleX(scale);
              p.scaleY(scale);
            }
          };

          const onMove = (event: PointerEvent) => {
            nx = gsap.utils.clamp(
              -1,
              1,
              (event.clientX / window.innerWidth) * 2 - 1,
            );
            ny = gsap.utils.clamp(
              -1,
              1,
              (event.clientY / window.innerHeight) * 2 - 1,
            );
            dirty = true;
          };

          const onLeave = () => {
            nx = 0;
            ny = 0;
            dirty = true;
          };

          gsap.ticker.add(apply);
          window.addEventListener("pointermove", onMove, { passive: true });
          document.addEventListener("pointerleave", onLeave);
          window.addEventListener("blur", onLeave);

          return () => {
            gsap.ticker.remove(apply);
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("blur", onLeave);
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      className={styles.hero}
      aria-label="Introduction"
      data-hero-root
    >
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: `.${styles.hero} [data-reveal],.${styles.hero} [data-line],.${styles.hero} .${styles.personReveal},.${styles.hero} .${styles.darkPanel}{opacity:1!important;transform:none!important}`,
          }}
        />
      </noscript>

      {/* --- backdrop: GSAP owns transform/opacity, CSS owns the paint.
              Wrapped so the Hero -> Work transition can retire the whole
              ground in one fade without touching the glow/grid opacity that
              the pointer handler owns on the children. --- */}
      <div className={styles.backdrop} aria-hidden="true">
        {/* The cream base stays put; only the developer side dissolves, so
            the handoff never washes the whole frame to muddy grey. */}
        <div className={styles.canvasLight} />
        <div className={styles.backdropDark} data-hero-backdrop>
        <div ref={darkPanelRef} className={styles.darkPanel}>
          <div className={styles.darkPanelFill} />
          <svg
            className={styles.devSignals}
            viewBox="0 0 600 900"
            preserveAspectRatio="xMidYMid slice"
          >
            {SIGNALS.map((d) => (
              <path key={d} d={d} data-signal fill="none" strokeWidth="1" />
            ))}
          </svg>
          <span className={styles.seam} data-seam />
        </div>
        <div ref={glowRef} className={styles.designerGlow} />
        <div ref={gridRef} className={styles.devGrid} />
        </div>
      </div>

      <div className={styles.inner}>
        <header className={styles.header} data-hero-fade data-exit="up">
          <a className={styles.logo} href="#main" data-reveal="nav">
            Saad<span className={styles.logoDot}>.</span>
          </a>

          <nav className={styles.nav} aria-label="Primary">
            <ul className={styles.navList}>
              {NAV.map((item) => (
                <li key={item.label} data-reveal="nav">
                  <a
                    className={`${styles.navLink} ${item.current ? styles.navLinkCurrent : ""}`}
                    href={item.href}
                    aria-current={item.current ? "true" : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <a className={styles.connect} href="#contact" data-reveal="nav">
            Let&apos;s Connect
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
              <path
                d="M4.5 11.5 11.5 4.5M5.6 4.5h5.9v5.9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </header>

        <div className={styles.stage}>
          <HeroCopy />

          {/* The person is the still centre of the composition: no pointer
              parallax, no entrance travel. Only its lighting changes. */}
          <div className={styles.person} data-hero-person>
            <div ref={personRevealRef} className={styles.personReveal}>
              <Image
                className={styles.personImg}
                src={PERSON_SRC}
                alt="Saad, designer and developer, standing with arms crossed"
                width={PERSON_W}
                height={PERSON_H}
                priority
                quality={88}
                sizes={PERSON_SIZES}
              />
              <div
                ref={personDarkRef}
                className={styles.personDark}
                aria-hidden="true"
              >
                <Image
                  className={styles.personImg}
                  src={PERSON_SRC}
                  alt=""
                  width={PERSON_W}
                  height={PERSON_H}
                  priority
                  quality={88}
                  sizes={PERSON_SIZES}
                />
              </div>
            </div>
          </div>

          <DesignCluster />
          <CodeCluster />
        </div>
      </div>
    </section>
  );
});

export default Hero;

"use client";

import { useRef } from "react";
import {
  ArrowRight,
  ArrowUp,
  EnvelopeSimple,
  GithubLogo,
  LinkedinLogo,
} from "@phosphor-icons/react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { getLenis } from "@/components/SmoothScroll";
import {
  resetStage,
  setStageTravelling,
  settleStage,
  stageIsArmed,
} from "@/components/experience/stageBeats";
import { navigateToStage } from "@/components/experience/stageNavigation";
import { NAV_LINKS, SOCIAL_LINKS } from "@/components/contact/siteLinks";
import FooterFluid from "./FooterFluid";
import styles from "./SiteFooter.module.css";

const MOTION = "(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SOCIAL_ICONS = {
  LinkedIn: LinkedinLogo,
  GitHub: GithubLogo,
  Email: EnvelopeSimple,
} as const;

/**
 * The footer.
 *
 * `doc/moresimple.md` asks for a calm ending after the animated parts of the
 * site, so the DOM motion is one short entrance. FooterFluid owns only the
 * liquid pixels and the content's SVG displacement filter. The original DOM
 * remains accessible and interactive while its painted surface ripples.
 *
 * The interesting part is not the animation, it is the navigation. Work and
 * Case Studies live inside the cinematic stage, where every scroll position is
 * a gesture-held rest and a plain `#hash` jump would drop the page between
 * rests and soft-lock it — the failure `doc/WORK_TO_CASES.md` §10 documents.
 * So these links do not jump. They unwind the stage through `stageBeats.ts`,
 * move the scroll, and let each beat settle itself exactly as it does on a
 * reload at that position.
 */
export default function SiteFooter() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add(MOTION, () => {
        root.dataset.footerReady = "true";
        const rule = root.querySelector<HTMLElement>("[data-footer-rule]");
        const cols = gsap.utils.toArray<HTMLElement>("[data-footer-col]", root);

        gsap.set(rule, { autoAlpha: 1, scaleX: 0 });
        gsap.set(cols, { autoAlpha: 0, y: 22 });

        const tl = gsap
          .timeline({ paused: true })
          .to(rule, { scaleX: 1, duration: 0.9, ease: "power2.inOut" }, 0)
          /* Small distance, gentle ease, close stagger. The footer should feel
             like the page settling, not like one more thing arriving. */
          .to(
            cols,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.66,
              ease: "power2.out",
              stagger: 0.08,
            },
            0.16,
          );

        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top 88%",
          once: true,
          onEnter: () => tl.play(),
        });

        return () => {
          delete root.dataset.footerReady;
          trigger.kill();
          tl.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  /**
   * Home, and the loop `doc/moresimple.md` asks for: arrive back at the hero in
   * its balanced state rather than at a page still holding the end of a story.
   *
   * Unwinding first is what makes the glide possible. By the time this button
   * is on screen the whole stage has scrolled off above the viewport, so
   * putting five chapters, the flight and the hero transformation back to zero
   * is invisible — and the scroll home then travels a page that is already in
   * its opening state, instead of rewinding through six viewports of pinned
   * timelines that were never scrub-linked in the first place.
   */
  const backToTop = () => {
    if (stageIsArmed()) resetStage();

    const lenis = getLenis();
    if (lenis && !reducedMotion()) {
      /* The glide crosses the stage boundary on its way home, and the boundary
         watcher in `case-featured` cannot tell a deliberate journey from the
         page arriving below the story by accident. Left unflagged it grabbed
         this glide at the last chapter and parked it there — measured: it
         stopped at 3522 instead of 0. */
      setStageTravelling(true);
      lenis.start();
      /* `lock` keeps a stray flick from hijacking the glide, the same way every
         beat on the stage holds the page while it plays. */
      lenis.scrollTo(0, {
        duration: 1.45,
        lock: true,
        onComplete: () => {
          setStageTravelling(false);
          /* Home is a rest position like any other, so let each beat take the
             page still again exactly as it would on a reload here. */
          settleStage();
        },
      });
      return;
    }
    setStageTravelling(false);
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  /** Rebuild the stage at that beat instead of jumping into its sticky DOM. */
  const goToBeat =
    (beat: "work" | "cases" | "contact") =>
    (event: React.MouseEvent) => {
      if (navigateToStage(beat)) event.preventDefault();
    };

  return (
    <footer
      ref={rootRef}
      id="footer"
      className={styles.footer}
      aria-label="Site footer"
      data-after-stage
    >
      <FooterFluid footerRef={rootRef} />

      <div className={styles.inner} data-footer-content>
        <div className={styles.wordmark} data-footer-col aria-hidden="true">
          <span data-footer-text>Abdullah</span>
        </div>

        <div className={styles.grid}>
          <div className={styles.brand} data-footer-col>
            <p className={styles.role}>
              <span data-footer-text>Designer × Full-stack Developer</span>
            </p>
            <p className={styles.blurb}>
              <span data-footer-text>
                Building thoughtful digital products.
              </span>
            </p>
          </div>

          <nav className={styles.col} data-footer-col aria-label="Explore">
            <h2 className={styles.colHead}>
              <span data-footer-text>Explore</span>
            </h2>
            <ul className={styles.list}>
              {NAV_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    className={styles.link}
                    href={item.href}
                    onClick={item.beat ? goToBeat(item.beat) : undefined}
                  >
                    <span data-footer-text>{item.label}</span>
                    <ArrowRight
                      className={styles.navArrow}
                      weight="regular"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.connectGroup} data-footer-col>
            <nav className={styles.connect} aria-label="Connect">
              <h2 className={styles.colHead}>
                <span data-footer-text>Connect</span>
              </h2>
              <ul className={styles.list}>
                {SOCIAL_LINKS.map((item) => {
                  const SocialIcon = SOCIAL_ICONS[item.label];
                  return (
                    <li key={item.label}>
                      <a
                        className={styles.socialLink}
                        href={item.href}
                        {...(item.href.startsWith("http")
                          ? { target: "_blank", rel: "noreferrer noopener" }
                          : {})}
                      >
                        <SocialIcon
                          className={styles.socialIcon}
                          weight={item.label === "Email" ? "regular" : "fill"}
                          aria-hidden="true"
                        />
                        <span data-footer-text>{item.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <button
              type="button"
              className={styles.top}
              onClick={backToTop}
              aria-label="Back to top"
            >
              <span className={styles.topCircle} aria-hidden="true">
                <ArrowUp weight="regular" />
              </span>
              <span className={styles.topLabel} data-footer-text>
                Back to top
              </span>
            </button>
          </div>
        </div>

        <div className={styles.divider} data-footer-rule aria-hidden="true">
          <span />
        </div>

        <div className={styles.base} data-footer-col>
          <p>
            <span data-footer-text>© 2026 Abdullah.</span>
          </p>
          <p>
            <span data-footer-text>
              Designed with intention. Built with code.
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

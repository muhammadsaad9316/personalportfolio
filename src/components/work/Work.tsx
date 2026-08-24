"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import ProjectPreview from "./ProjectPreview";
import {
  CENTRE,
  CENTRE_LEAN,
  CONNECTORS,
  PROJECTS,
  type Project,
} from "./workContent";
import styles from "./Work.module.css";

/** Four equal ring segments with a gap where each connector lands. */
const RING_C = 2 * Math.PI * CENTRE.r;
const RING_GAP = 26;
const RING_DASH = `${RING_C / 4 - RING_GAP} ${RING_GAP}`;
/** Shift the dash pattern so a gap is centred on each 45-degree hub. */
const RING_DASH_OFFSET = RING_C / 8 - RING_GAP / 2;

/** Hub dot positions, in the connector SVG's viewBox. */
const HUB_DOTS = PROJECTS.map((p) => CONNECTORS[p.placement].hub);

export type WorkHandle = {
  /** Play the documented entrance: text, then centre, then lines, then
   *  projects. */
  enter: (speed?: number) => void;
  /** Build the exit for the return to Hero: projects first, lines retracting
   *  toward the centre, the circle shrinking, heading last. */
  exit: () => gsap.core.Timeline;
  /** Put everything back to its pre-entrance state, ready to enter again. */
  reset: () => void;
  /** Drop the hover/focus state. Used by `work-to-cases` the moment the
   *  section starts leaving, so no card is left scaled or dimmed. */
  clearActive: () => void;
};

const Work = forwardRef<WorkHandle>(function Work(_props, ref) {
  const rootRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  // React owns only the discrete state. Pointer coordinates stay in GSAP.
  const [active, setActive] = useState<number | null>(null);
  /** The timeline half of the handle. `clearActive` is React state, so it
   *  lives on the imperative handle directly rather than in here. */
  const api = useRef<Pick<WorkHandle, "enter" | "exit" | "reset"> | null>(null);
  useImperativeHandle(ref, () => ({
    enter: (speed?: number) => api.current?.enter(speed),
    exit: () => api.current?.exit() ?? gsap.timeline(),
    reset: () => api.current?.reset(),
    clearActive: () => setActive(null),
  }));
  type Setter = ReturnType<typeof gsap.quickTo>;
  const labelXY = useRef<{ x: Setter; y: Setter } | null>(null);

  /* ------------------------------------------------------------------
   * Entrance: heading -> centre -> lines -> projects.  One timeline,
   * one ScrollTrigger named `work-intro`.
   * ---------------------------------------------------------------- */
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      const lines = Array.from(
        root.querySelectorAll<SVGPathElement>("[data-connector]"),
      );

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          [
            q("[data-work-reveal]"),
            q("[data-project]"),
            q("[data-hub-dot]"),
            q("[data-trace-node]"),
          ],
          { autoAlpha: 1, x: 0, y: 0, scale: 1 },
        );
        gsap.set(q("[data-centre]"), { autoAlpha: 1, scale: 1 });
        gsap.set(lines, {
          strokeDasharray: "none",
          strokeDashoffset: 0,
          autoAlpha: 1,
        });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const armed = () => {
          gsap.set(q("[data-work-reveal]"), { y: 26, autoAlpha: 0 });
          gsap.set(q("[data-centre]"), { scale: 0.85, autoAlpha: 0 });
          gsap.set(q("[data-hub-dot]"), { scale: 0, autoAlpha: 0 });
          gsap.set(q("[data-trace-node]"), { scale: 0, autoAlpha: 0 });
          gsap.set(q("[data-project]"), { y: 30, scale: 1, autoAlpha: 0 });
          for (const line of lines) {
            const len = line.getTotalLength();
            gsap.set(line, {
              strokeDasharray: len,
              strokeDashoffset: len,
              autoAlpha: 1,
            });
          }
        };
        armed();

        /* The documented order, with each beat given room to land before the
           next begins: text, centre, lines, projects. */
        const buildEnter = () =>
          gsap
            .timeline({ defaults: { ease: "power3.out" } })
            .addLabel("heading", 0)
            .to(
              q("[data-work-reveal]"),
              { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.12 },
              "heading",
            )
            .addLabel("centre", 0.62)
            .to(
              q("[data-centre]"),
              { scale: 1, autoAlpha: 1, duration: 0.8, ease: "back.out(1.4)" },
              "centre",
            )
            .addLabel("lines", 1.18)
            .to(
              lines,
              {
                strokeDashoffset: 0,
                duration: 0.85,
                stagger: 0.055,
                ease: "power2.inOut",
              },
              "lines",
            )
            .to(
              q("[data-hub-dot]"),
              { scale: 1, autoAlpha: 1, duration: 0.35, stagger: 0.09 },
              "lines+=0.5",
            )
            .to(
              q("[data-trace-node]"),
              {
                scale: 1,
                autoAlpha: 1,
                duration: 0.3,
                stagger: 0.025,
                transformOrigin: "center center",
              },
              "lines+=0.48",
            )
            .addLabel("projects", 1.95)
            .to(
              q("[data-project]"),
              { y: 0, autoAlpha: 1, duration: 0.75, stagger: 0.11 },
              "projects",
            );

        /* Mirror of the entrance for the way back: projects leave first, the
           lines retract into the centre, the circle shrinks, and the heading
           is the last thing to go. */
        const buildExit = () =>
          gsap
            .timeline({ defaults: { ease: "power2.in" } })
            .to(
              q("[data-project]"),
              {
                y: 18,
                scale: 0.94,
                autoAlpha: 0,
                duration: 0.45,
                stagger: 0.07,
              },
              0,
            )
            .to(
              q("[data-hub-dot]"),
              { scale: 0, autoAlpha: 0, duration: 0.3, stagger: 0.05 },
              0.18,
            )
            .to(
              q("[data-trace-node]"),
              {
                scale: 0,
                autoAlpha: 0,
                duration: 0.28,
                stagger: 0.02,
                transformOrigin: "center center",
              },
              0.18,
            )
            .to(
              lines,
              {
                strokeDashoffset: (_i: number, t: SVGPathElement) =>
                  t.getTotalLength(),
                duration: 0.55,
                stagger: 0.035,
                ease: "power2.inOut",
              },
              0.28,
            )
            .to(
              q("[data-centre]"),
              { scale: 0.8, autoAlpha: 0, duration: 0.45 },
              0.55,
            )
            .to(
              q("[data-work-reveal]"),
              { y: -20, autoAlpha: 0, duration: 0.45, stagger: 0.07 },
              0.72,
            );

        api.current = {
          enter: (speed = 1) => {
            buildEnter().timeScale(speed).play(0);
          },
          exit: buildExit,
          reset: armed,
        };

        // When the wrapper is not driving the handoff (touch, narrow windows)
        // the section reveals itself on scroll, as before.
        const driven = window.matchMedia(
          "(min-width: 900px) and (hover: hover) and (pointer: fine)",
        ).matches;
        if (!driven) {
          ScrollTrigger.create({
            id: "work-intro",
            trigger: root,
            start: "top 68%",
            once: true,
            // Touch gets a shorter entrance, per the device modes table.
            onEnter: () => api.current?.enter(1.7),
          });
        }
      });

      /* ----------------------------------------------------------------
       * Cursor label. Fine pointer only — touch and keyboard never need
       * a pointer-tracked element.
       * -------------------------------------------------------------- */
      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const label = labelRef.current;
          if (!label) return;

          labelXY.current = {
            x: gsap.quickTo(label, "x", { duration: 0.42, ease: "power3" }),
            y: gsap.quickTo(label, "y", { duration: 0.42, ease: "power3" }),
          };

          const onMove = (event: PointerEvent) => {
            const box = rootRef.current
              ?.querySelector("[data-network]")
              ?.getBoundingClientRect();
            if (!box) return;
            labelXY.current?.x(event.clientX - box.left);
            labelXY.current?.y(event.clientY - box.top);
          };

          window.addEventListener("pointermove", onMove, { passive: true });
          return () => {
            window.removeEventListener("pointermove", onMove);
            labelXY.current = null;
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  /* ------------------------------------------------------------------
   * Interaction state. Hover and keyboard focus run the exact same path.
   * ---------------------------------------------------------------- */
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const cards = Array.from(
        root.querySelectorAll<HTMLElement>("[data-project-motion]"),
      );
      const traces = Array.from(
        root.querySelectorAll<SVGGElement>("[data-trace-active]"),
      );
      const dots = Array.from(
        root.querySelectorAll<SVGCircleElement>("[data-hub-dot]"),
      );
      const centre = root.querySelector<SVGGElement>("[data-centre-pointer]");
      const branch = root.querySelector<SVGGElement>("[data-centre-branch]");
      const packet = root.querySelector<SVGRectElement>("[data-centre-packet]");
      const label = labelRef.current;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const d = reduced ? 0.001 : 0.45;

      cards.forEach((card, i) => {
        const isActive = active === i;
        const quiet = active !== null && !isActive;
        gsap.to(card, {
          scale: isActive ? 1.035 : 1,
          autoAlpha: quiet ? 0.45 : 1,
          duration: d,
          ease: "power3.out",
        });
      });

      traces.forEach((trace, i) => {
        const isActive = active === i;
        const paths = Array.from(
          trace.querySelectorAll<SVGPathElement>("[data-connector-active]"),
        );
        paths.forEach((path) => {
          const len = path.getTotalLength();
          gsap.to(path, {
            strokeDasharray: len,
            strokeDashoffset: isActive ? 0 : len,
            duration: reduced ? 0.001 : 0.55,
            ease: "power2.inOut",
            overwrite: "auto",
          });
        });

        gsap.to(trace.querySelectorAll("[data-trace-node-active]"), {
          scale: isActive ? 1 : 0,
          autoAlpha: isActive ? 1 : 0,
          duration: reduced ? 0.001 : 0.3,
          stagger: isActive ? 0.035 : 0,
          ease: "power3.out",
          transformOrigin: "center center",
          overwrite: "auto",
        });

        const packet = trace.querySelector<SVGRectElement>("[data-trace-packet]");
        const pulse = trace.querySelector<SVGCircleElement>("[data-trace-pulse]");
        const main = trace.querySelector<SVGPathElement>("[data-trace-main]");
        if (packet) {
          gsap.killTweensOf(packet);
          gsap.set(packet, { x: 0, y: 0, autoAlpha: 0 });
        }
        if (pulse) {
          gsap.killTweensOf(pulse);
          gsap.set(pulse, { scale: 0.7, autoAlpha: 0 });
        }
        if (isActive && !reduced && packet && pulse && main) {
          gsap.fromTo(
            packet,
            { autoAlpha: 1 },
            {
              autoAlpha: 0,
              duration: 0.58,
              ease: "power2.inOut",
              motionPath: {
                path: main,
                align: main,
                alignOrigin: [0.5, 0.5],
              },
              overwrite: true,
            },
          );
          gsap.fromTo(
            pulse,
            { scale: 0.7, autoAlpha: 1 },
            {
              scale: 2,
              autoAlpha: 0,
              delay: 0.48,
              duration: 0.34,
              ease: "power2.out",
              transformOrigin: "center center",
              overwrite: true,
            },
          );
        }
      });

      dots.forEach((dot, i) => {
        gsap.to(dot, {
          scale: active === i ? 1.9 : 1,
          duration: d,
          ease: "power3.out",
          transformOrigin: "center center",
        });
      });

      if (centre) {
        const lean =
          active === null
            ? { x: 0, y: 0, rotate: 0 }
            : CENTRE_LEAN[PROJECTS[active].placement];
        gsap.to(centre, {
          x: lean.x,
          y: lean.y,
          rotation: `${lean.rotate}_short`,
          duration: reduced ? 0.001 : 0.6,
          ease: "power3.out",
          transformOrigin: "center center",
          overwrite: "auto",
        });
      }

      if (branch) {
        gsap.to(branch, {
          scaleX: active === null ? 0 : 1,
          duration: reduced ? 0.001 : 0.38,
          ease: active === null ? "power2.in" : "power3.out",
          transformOrigin: "left center",
          overwrite: "auto",
        });
      }

      if (packet) {
        gsap.killTweensOf(packet);
        if (active === null || reduced) {
          gsap.set(packet, { x: 0, autoAlpha: 0 });
        } else {
          gsap.fromTo(
            packet,
            { x: 0, autoAlpha: 1 },
            {
              x: 26,
              autoAlpha: 0,
              duration: 0.46,
              ease: "power2.inOut",
              overwrite: true,
            },
          );
        }
      }

      if (label) {
        gsap.to(label, {
          autoAlpha: active === null ? 0 : 1,
          scale: active === null ? 0.85 : 1,
          duration: reduced ? 0.001 : 0.3,
          ease: "power2.out",
        });
      }
    },
    { scope: rootRef, dependencies: [active] },
  );

  /** Keyboard focus produces the identical state, and parks the label on
   *  the focused card so it does not need a pointer to be positioned. */
  const focusProject = useCallback((index: number, el: HTMLElement | null) => {
    setActive(index);
    const box = rootRef.current
      ?.querySelector("[data-network]")
      ?.getBoundingClientRect();
    const card = el?.getBoundingClientRect();
    if (box && card && labelXY.current) {
      labelXY.current.x(card.left - box.left + card.width / 2);
      labelXY.current.y(card.top - box.top + card.height / 2);
    }
  }, []);

  return (
    <section
      ref={rootRef}
      id="work"
      className={styles.work}
      aria-labelledby="work-heading"
    >
      <div className={styles.inner}>
        {/* `work-to-cases` owns this wrapper's transform/opacity; the Work
            entrance owns [data-work-reveal] inside it. One owner each. */}
        <div className={styles.introOut} data-cases-out="intro">
          <header className={styles.intro}>
            <p className={styles.eyebrow} data-work-reveal>
              <span className={styles.eyebrowNum}>02</span>
              <span className={styles.eyebrowSlash}>/</span>
              Work
            </p>

            <h2 id="work-heading" className={styles.heading} data-work-reveal>
              Digital products.
              <br />
              <em className={styles.headingAccent}>Real impact.</em>
            </h2>

            <p className={styles.lede} data-work-reveal>
              From concept to launch, I help businesses grow with technology
              that works.
            </p>

            <a className={styles.viewAll} href="/work" data-work-reveal>
              View All Projects
              <svg
                viewBox="0 0 24 24"
                width="17"
                height="17"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </header>
        </div>

        <div className={styles.network} data-network>
          {/* Connectors and the impact ring. Inline SVG defines the shapes,
              CSS owns their colour and width, GSAP owns dash and transform.
              The wrapping layers exist so `work-to-cases` has an element of
              its own to fade and shrink — the Work entrance already owns the
              paths' dash values and the circle's scale. */}
          <div className={styles.svgLayer} data-cases-out="wires">
            <svg
              className={styles.wires}
              viewBox="0 0 1000 760"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {PROJECTS.map((p) => {
                const connector = CONNECTORS[p.placement];
                const nodes = [...connector.commits, connector.end];
                return (
                  <g key={p.id}>
                    <path
                      data-connector
                      className={styles.wire}
                      d={connector.path}
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      data-connector
                      className={styles.wire}
                      d={connector.fork}
                      vectorEffect="non-scaling-stroke"
                    />
                    {nodes.map(([x, y], i) => (
                      <circle
                        key={`base-node-${i}`}
                        data-trace-node
                        className={styles.traceNode}
                        cx={x}
                        cy={y}
                        r={i === nodes.length - 1 ? 4.5 : 3.2}
                      />
                    ))}
                    <g data-trace-active>
                      <path
                        data-connector-active
                        data-trace-main
                        className={styles.wireActive}
                        d={connector.path}
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        data-connector-active
                        className={styles.wireActive}
                        d={connector.fork}
                        vectorEffect="non-scaling-stroke"
                      />
                      {nodes.map(([x, y], i) => (
                        <circle
                          key={`active-node-${i}`}
                          data-trace-node-active
                          className={styles.traceNodeActive}
                          cx={x}
                          cy={y}
                          r={i === nodes.length - 1 ? 4.5 : 3.2}
                        />
                      ))}
                      <circle
                        data-trace-pulse
                        className={styles.tracePulse}
                        cx={connector.end[0]}
                        cy={connector.end[1]}
                        r="5.5"
                      />
                      <rect
                        data-trace-packet
                        className={styles.tracePacket}
                        x="-2.75"
                        y="-2.75"
                        width="5.5"
                        height="5.5"
                        rx="1.25"
                      />
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className={styles.svgLayer} data-cases-out="centre">
            <svg
              className={styles.centre}
              viewBox="0 0 1000 760"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
              data-centre
            >
              <g>
                <circle
                  className={styles.ring}
                  cx={CENTRE.x}
                  cy={CENTRE.y}
                  r={CENTRE.r}
                  strokeDasharray={RING_DASH}
                  strokeDashoffset={RING_DASH_OFFSET}
                />
                <g data-centre-pointer>
                  <circle
                    className={styles.pointerBounds}
                    cx={CENTRE.x}
                    cy={CENTRE.y}
                    r="52"
                  />
                  <g data-centre-branch>
                    <path
                      className={styles.gitBranch}
                      d={`M${CENTRE.x + 4} ${CENTRE.y} H${CENTRE.x + 36} M${CENTRE.x + 27} ${CENTRE.y - 9} L${CENTRE.x + 36} ${CENTRE.y} L${CENTRE.x + 27} ${CENTRE.y + 9} M${CENTRE.x + 11} ${CENTRE.y} C${CENTRE.x + 11} ${CENTRE.y - 10} ${CENTRE.x + 16} ${CENTRE.y - 16} ${CENTRE.x + 25} ${CENTRE.y - 16}`}
                    />
                    <circle
                      className={styles.branchNode}
                      cx={CENTRE.x + 25}
                      cy={CENTRE.y - 16}
                      r="3.5"
                    />
                    <rect
                      data-centre-packet
                      className={styles.dataPacket}
                      x={CENTRE.x + 5}
                      y={CENTRE.y - 2.5}
                      width="5"
                      height="5"
                      rx="1"
                    />
                  </g>
                </g>
                <circle
                  className={styles.commitNode}
                  cx={CENTRE.x}
                  cy={CENTRE.y}
                  r="5.5"
                />
                {HUB_DOTS.map(([x, y], i) => (
                  <circle
                    key={i}
                    data-hub-dot
                    className={styles.hubDot}
                    cx={x}
                    cy={y}
                    r="6"
                  />
                ))}
              </g>
            </svg>
          </div>

          <ul className={styles.projects}>
            {PROJECTS.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                onEnter={focusProject}
                onLeave={() => setActive(null)}
              />
            ))}
          </ul>

          <div ref={labelRef} className={styles.cursorLabel} aria-hidden="true">
            View Case Study
            <svg viewBox="0 0 16 16" width="11" height="11" fill="none">
              <path
                d="M4.5 11.5 11.5 4.5M5.6 4.5h5.9v5.9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
});

export default Work;

/**
 * One project.
 *
 * Three nested layers, one motion owner each, per the property boundary in
 * doc/MOTION_ARCHITECTURE.md:
 *
 *   li[data-project]        Work entrance / exit  (y, autoAlpha)
 *   .projectMotion          hover + focus state   (scale, autoAlpha)
 *   .projectOut             work-to-cases         (scale, y, autoAlpha)
 *
 * The flagship keeps its `.projectOut` untouched — its frame is the element
 * that travels into the case study, so only its text leaves.
 */
function ProjectCard({
  project,
  index,
  onEnter,
  onLeave,
}: {
  project: Project;
  index: number;
  onEnter: (index: number, el: HTMLElement | null) => void;
  onLeave: () => void;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const flagship = project.flagship === true;

  return (
    <li
      className={`${styles.project} ${styles[project.placement]}${flagship ? ` ${styles.flagship}` : ""
        }`}
      data-project
    >
      <div className={styles.projectMotion} data-project-motion>
        <div
          className={styles.projectOut}
          data-cases-out={flagship ? undefined : "card"}
        >
          <a
            ref={linkRef}
            className={styles.projectLink}
            href={project.href}
            onMouseEnter={() => onEnter(index, linkRef.current)}
            onMouseLeave={onLeave}
            onFocus={() => onEnter(index, linkRef.current)}
            onBlur={onLeave}
          >
            <span
              className={styles.projectMeta}
              data-cases-out={flagship ? "cardText" : undefined}
            >
              <span className={styles.projectHead}>
                <span className={styles.projectDot} />
                <span className={styles.projectNum}>{project.num}</span>
              </span>
              <span className={styles.projectName}>{project.name}</span>
              <span className={styles.projectKind}>{project.kind}</span>
            </span>
            <span
              className={styles.projectFrame}
              data-flight-frame={flagship ? "" : undefined}
            >
              <ProjectPreview project={project} />
            </span>
            <span
              className={styles.projectSummary}
              data-cases-out={flagship ? "cardText" : undefined}
            >
              {project.summary}
            </span>
          </a>
        </div>
      </div>
    </li>
  );
}

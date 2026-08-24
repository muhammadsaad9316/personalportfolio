/**
 * Hero ambient motion.
 *
 * Every builder here animates through GSAP only — they are helpers for the
 * Hero timeline, not a second animation system. They are created inside a
 * `gsap.matchMedia()` context, so GSAP reverts them automatically, and none of
 * them is created under `prefers-reduced-motion: reduce`.
 */
import { gsap } from "@/lib/gsap";
import { CHART_SERIES, TYPE_SPECS } from "./heroContent";

/** Extra character beats charged at each line break so typing breathes. */
const LINE_GAP = 2.5;
/** Characters per second. */
const CODE_CPS = 46;

type Slot = {
  el: HTMLElement;
  lineIndex: number;
  lineEl: HTMLElement;
  text: string;
  start: number;
  end: number;
};

/**
 * Types a list of elements as one continuous stream. Each element keeps the
 * text it was server-rendered with, so the markup still reads correctly before
 * hydration and with JavaScript disabled.
 */
function makeTypewriter(els: HTMLElement[], caret: HTMLElement | null) {
  let total = 0;
  let previousLine: HTMLElement | null = null;

  const slots: Slot[] = els.map((el) => {
    const lineEl = (el.closest("[data-code-line]") as HTMLElement) ?? el;
    if (previousLine && lineEl !== previousLine) total += LINE_GAP;
    previousLine = lineEl;

    const text = el.textContent ?? "";
    const start = total;
    total += text.length;
    return {
      el,
      lineEl,
      lineIndex: Number(lineEl.dataset.lineIndex ?? "0"),
      text,
      start,
      end: total,
    };
  });

  let caretLine: HTMLElement | null = null;
  let activeLine = -1;

  const render = (n: number, onLine?: (index: number) => void) => {
    let active: Slot | undefined;

    for (const slot of slots) {
      const next =
        n >= slot.end
          ? slot.text
          : n <= slot.start
            ? ""
            : slot.text.slice(0, Math.floor(n - slot.start));
      if (slot.el.textContent !== next) slot.el.textContent = next;
      if (n > slot.start) active = slot;
    }

    const head = active ?? slots[0];
    if (!head) return;

    if (caret && head.lineEl !== caretLine) {
      caretLine = head.lineEl;
      head.lineEl.appendChild(caret);
    }
    if (head.lineIndex !== activeLine) {
      activeLine = head.lineIndex;
      onLine?.(activeLine);
    }
  };

  return { total, render };
}

/** Blinking caret. The typewriter owns its position, this owns its opacity. */
export function caretBlink(caret: Element | null) {
  if (!caret) return [];
  return [
    gsap.to(caret, {
    autoAlpha: 0,
    duration: 0.55,
      repeat: -1,
      yoyo: true,
      ease: "steps(1)",
    }),
  ];
}

/**
 * The signature developer moment: the code block writes itself, holds, then
 * backspaces and writes again.
 */
export function codeTypingLoop(
  tokens: HTMLElement[],
  caret: HTMLElement | null,
  gutter: HTMLElement[],
) {
  if (!tokens.length) return [];

  const writer = makeTypewriter(tokens, caret);
  const state = { n: 0 };

  const onLine = (index: number) => {
    gutter.forEach((no, i) => {
      gsap.to(no, {
        autoAlpha: i <= index ? 1 : 0.3,
        duration: 0.3,
        overwrite: "auto",
      });
    });
  };

  const render = () => writer.render(state.n, onLine);

  return [
    gsap
    .timeline({ repeat: -1 })
    .to(state, {
      n: writer.total,
      duration: writer.total / CODE_CPS,
      ease: "none",
      onUpdate: render,
    })
    .to({}, { duration: 4.6 })
    .to(state, { n: 0, duration: 0.7, ease: "power2.in", onUpdate: render })
    .to({}, { duration: 0.45 }),
  ];
}

/** Catmull-Rom through the points, emitted as cubic beziers. */
function chartPath(values: number[], w = 200, h = 56, pad = 4) {
  const n = values.length;
  const px = (i: number) => pad + (i * (w - pad * 2)) / (n - 1);
  const py = (v: number) => h - pad - v * (h - pad * 2);
  const pts = values.map((v, i) => [px(i), py(v)] as [number, number]);

  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d +=
      `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)}` +
      ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)}` +
      ` ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Server-rendered starting curve, so the card is never empty. */
export function initialChartPath() {
  return chartPath(CHART_SERIES[0].values);
}

/** The dashboard curve morphs between datasets; a marker rides the line. */
export function chartLoop(
  path: SVGPathElement | null,
  marker: SVGCircleElement | null,
  metric: HTMLElement | null,
) {
  if (!path) return [];

  const values = [...CHART_SERIES[0].values];
  const delta = { v: CHART_SERIES[0].delta };
  const ride = { p: 0 };
  let length = path.getTotalLength();

  const moveMarker = () => {
    if (!marker || !length) return;
    const point = path.getPointAtLength(ride.p * length);
    marker.setAttribute("cx", point.x.toFixed(2));
    marker.setAttribute("cy", point.y.toFixed(2));
  };

  const draw = () => {
    path.setAttribute("d", chartPath(values));
    length = path.getTotalLength();
    moveMarker();
  };

  draw();

  const morph = gsap.timeline({ repeat: -1 });
  CHART_SERIES.forEach((_, i) => {
    const next = CHART_SERIES[(i + 1) % CHART_SERIES.length];
    morph
      .to({}, { duration: 2.4 })
      .to(values, {
        endArray: next.values,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: draw,
      })
      .to(
        delta,
        {
          v: next.delta,
          duration: 1.5,
          ease: "power2.inOut",
          onUpdate: () => {
            if (metric) metric.textContent = `+ ${delta.v.toFixed(1)}%`;
          },
        },
        "<",
      );
  });

  const rider = gsap.to(ride, {
    p: 1,
    duration: 4.2,
    ease: "none",
    repeat: -1,
    onUpdate: moveMarker,
  });

  return [morph, rider];
}

/** Wireframe rows rebuild themselves, like a layout being laid down. */
export function wireLoop(bars: Element[]) {
  if (!bars.length) return [];
  return [
    gsap
    .timeline({ repeat: -1, repeatDelay: 2.4 })
    .fromTo(
      bars,
      { scaleX: 0.18 },
      {
        scaleX: 1,
        duration: 0.5,
        stagger: 0.07,
        ease: "power2.out",
        transformOrigin: "left center",
      },
    )
    .to(
      bars,
      {
        scaleX: 0.18,
        duration: 0.32,
        stagger: { each: 0.045, from: "end" },
        ease: "power2.in",
        transformOrigin: "left center",
      },
      "+=1.6",
    ),
  ];
}

/** Type specimen cycles weight, label, and the swatch selection ring. */
export function typeSpecLoop(
  sample: HTMLElement | null,
  label: HTMLElement | null,
  ring: HTMLElement | null,
  swatches: HTMLElement[],
) {
  if (!sample) return [];
  const tl = gsap.timeline({ repeat: -1 });

  TYPE_SPECS.forEach((spec, i) => {
    const swatch = swatches[i % swatches.length];
    tl.to(sample, {
      fontWeight: spec.weight,
      duration: 0.55,
      ease: "power2.inOut",
    })
      .to(
        ring,
        { x: swatch ? swatch.offsetLeft : 0, duration: 0.5, ease: "power3.inOut" },
        "<",
      )
      .to(
        label,
        {
          autoAlpha: 0,
          duration: 0.16,
          onComplete: () => {
            if (label) label.textContent = spec.label;
          },
        },
        "<",
      )
      .to(label, { autoAlpha: 1, duration: 0.24 })
      .to({}, { duration: 1.6 });
  });

  return [tl];
}

/** Data flowing along the developer-side signal lines. */
export function signalLoop(paths: SVGPathElement[]) {
  const made: gsap.core.Animation[] = [];
  paths.forEach((path, i) => {
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: `${length * 0.16} ${length}` });
    made.push(gsap.fromTo(
      path,
      { strokeDashoffset: length * 0.16 },
      {
        strokeDashoffset: -length,
        duration: 5.5 + i * 1.6,
        ease: "none",
        repeat: -1,
        delay: i * 0.9,
      },
    ));
  });
  return made;
}

/** A slow highlight drifting across the designer-side dot grid. */
export function dotSweepLoop(sweep: HTMLElement | null) {
  if (!sweep) return [];
  return [
    gsap
    .timeline({ repeat: -1, repeatDelay: 1.4 })
    .fromTo(
      sweep,
      { xPercent: -70, autoAlpha: 0 },
      { xPercent: -10, autoAlpha: 1, duration: 1.2, ease: "power2.out" },
    )
    .to(sweep, { xPercent: 70, autoAlpha: 0, duration: 1.4, ease: "power2.in" }),
  ];
}

/** A light travelling down the split seam. */
export function seamLoop(seam: HTMLElement | null) {
  if (!seam) return [];
  return [
    gsap
    .timeline({ repeat: -1, repeatDelay: 2.2 })
    .fromTo(
      seam,
      { yPercent: -130, autoAlpha: 0 },
      { yPercent: -20, autoAlpha: 1, duration: 1.5, ease: "sine.out" },
    )
    .to(seam, { yPercent: 130, autoAlpha: 0, duration: 1.8, ease: "sine.in" }),
  ];
}

/** Small "live" indicators breathing on the data cards. */
export function pulseLoop(dots: HTMLElement[]) {
  if (!dots.length) return [];
  return [
    gsap.to(dots, {
    scale: 1.55,
    autoAlpha: 0.35,
    duration: 0.85,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
      stagger: 0.4,
      transformOrigin: "center center",
    }),
  ];
}

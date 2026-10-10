"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import type { createFooterFluid, FluidImpulse } from "./footerFluidSolver";
import styles from "./FooterFluid.module.css";

export default function FooterFluid({ footerRef }: { footerRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<SVGFEImageElement>(null);
  const filterRef = useRef<SVGFilterElement>(null);
  const filterId = `footer-liquid-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const footer = footerRef.current;
    const canvas = canvasRef.current;
    const content = footer?.querySelector<HTMLElement>("[data-footer-content]");
    const map = mapRef.current;
    const filter = filterRef.current;
    if (!footer || !canvas || !content || !map || !filter) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointers = new Map<string, { x: number; y: number }>();
    const pending: FluidImpulse[] = [];
    let engine: ReturnType<typeof createFooterFluid> = null;
    let create: typeof createFooterFluid | null = null;
    let loading = false;
    let visible = false, lost = false, unavailable = false, disposed = false;
    let raf = 0, frames = 0, lastFrame = 0, lastInput = 0;
    const touchMode = window.matchMedia("(pointer: coarse)").matches;
    let sampleCount = 0, sampleTime = 0, missedFrames = 0, slowWindows = 0;
    let quality = touchMode ? 0.75 : 1;
    let lastMap = 0;
    canvas.dataset.fluidQuality = quality < 1 ? "economy" : "full";
    let rect = footer.getBoundingClientRect();

    const state = (value: string) => { canvas.dataset.fluidState = value; };
    const pause = (reason: string) => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastFrame = 0;
      pending.length = 0;
      pointers.clear();
      content.style.removeProperty("filter");
      canvas.dataset.fluidDeforming = "false";
      canvas.dataset.fluidFrames = String(frames);
      state(reason);
    };

    const keyboardFocused = () => footer.contains(document.activeElement)
      && document.activeElement?.matches(":focus-visible");
    const allowed = () => visible && !document.hidden && !motion.matches && !lost && !unavailable && !disposed && !keyboardFocused();
    const measure = () => { rect = footer.getBoundingClientRect(); };
    const fail = (error: unknown) => {
      canvas.dataset.fluidError = error instanceof Error ? error.message : "WebGL rendering failed";
      pause("unsupported");
      unavailable = true;
      engine?.dispose();
      engine = null;
    };
    const resize = () => {
      measure();
      const box = content.getBoundingClientRect();
      // SVG's user space follows the content box; the simulation follows the footer.
      map.setAttribute("x", String(rect.left - box.left));
      map.setAttribute("y", String(rect.top - box.top));
      map.setAttribute("width", String(rect.width));
      map.setAttribute("height", String(rect.height));
      filter.setAttribute("x", "-32");
      filter.setAttribute("y", "-32");
      filter.setAttribute("width", String(box.width + 64));
      filter.setAttribute("height", String(box.height + 64));
      if (!engine || rect.width <= 0 || rect.height <= 0) return;
      try {
        engine.resize(rect.width, rect.height, quality);
        engine.render();
      } catch (error) {
        fail(error);
      }
    };

    const initialize = () => {
      if (engine || !allowed()) return;
      if (!create) {
        if (!loading) {
          loading = true;
          state("loading");
          import("./footerFluidSolver").then((module) => {
            if (disposed) return;
            create = module.createFooterFluid;
            loading = false;
            initialize();
            if (pending.length) wake();
          }).catch((error) => { if (!disposed) fail(error); });
        }
        return;
      }
      try {
        engine = create(canvas);
      } catch (error) {
        fail(error);
        return;
      }
      if (!engine) {
        unavailable = true;
        state("unsupported");
        return;
      }
      resize();
      if (engine) state("idle");
    };

    const tick = (now: number) => {
      raf = 0;
      if (!allowed() || !engine) return;
      const elapsed = lastFrame ? now - lastFrame : 1000 / 60;
      lastFrame = now;
      // Tail latency catches missed frames that a rolling average conceals.
      if (elapsed > 25) missedFrames++;
      sampleCount++;
      sampleTime += elapsed;
      // A frame-count-only window takes too long when rendering is already slow.
      if (sampleCount >= 30 || sampleTime >= 500) {
        slowWindows = missedFrames >= 2 ? slowWindows + 1 : 0;
        missedFrames = 0;
        sampleCount = 0;
        sampleTime = 0;
        if (slowWindows && quality > 0.5) {
          quality = quality === 1 ? 0.75 : 0.5;
          slowWindows = 0;
          resize();
          canvas.dataset.fluidQuality = quality === 0.5 ? "low" : "economy";
        } else if (slowWindows >= 2) {
          unavailable = true;
          engine.clear();
          engine.dispose();
          engine = null;
          pause("budget-fallback");
          return;
        }
      }
      if (!engine) return;
      try {
        // Collect last frame's finished map before submitting this frame's GPU work.
        const mapDue = now - lastMap >= (quality < 1 ? 1000 / 30 - 1 : 1000 / 60 - 1);
        const displacement = mapDue ? engine.readDisplacement() : null;
        if (mapDue) lastMap = now;
        for (const point of pending) engine.impulse(point, Math.min(rect.width, rect.height));
        pending.length = 0;
        engine.step(elapsed / 1000);
        if (displacement) {
          map.setAttribute("href", displacement);
          if (canvas.dataset.fluidDeforming !== "true") content.style.filter = `url(#${filterId})`;
          canvas.dataset.fluidDeforming = "true";
        }
      } catch (error) {
        fail(error);
        return;
      }
      frames++;
      if (frames % 30 === 0) canvas.dataset.fluidFrames = String(frames);
      if (now - lastInput < (touchMode ? 2600 : 3600)) {
        raf = requestAnimationFrame(tick);
      } else {
        engine.clear();
        pause("idle");
      }
    };

    const wake = () => {
      if (!allowed()) return;
      initialize();
      if (!engine || raf) return;
      lastFrame = 0;
      state("running");
      raf = requestAnimationFrame(tick);
    };

    const collect = (clientX: number, clientY: number, identifier: string) => {
      if (!allowed()) return;
      // A footer can move under the pointer while Lenis or native touch scrolls.
      measure();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (clientX - rect.left) / rect.width;
      const y = 1 - (clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      const previous = pointers.get(identifier);
      pointers.set(identifier, { x, y });
      const impulse = { x, y, dx: previous ? x - previous.x : 0, dy: previous ? y - previous.y : 0 };
      if (pending.length < 4) {
        pending.push(impulse);
      } else {
        const last = pending[pending.length - 1];
        last.x = x;
        last.y = y;
        last.dx += impulse.dx;
        last.dy += impulse.dy;
      }
      lastInput = performance.now();
      wake();
    };

    const input = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const samples = event.getCoalescedEvents?.();
      const point = samples?.length ? samples[samples.length - 1] : event;
      collect(point.clientX, point.clientY, `pointer-${event.pointerId}`);
    };
    const touch = (event: TouchEvent) => {
      // Native scrolling cancels pointermove; passive touchmove still paints under the finger.
      for (let i = 0; i < Math.min(event.changedTouches.length, 4); i++) {
        const point = event.changedTouches[i];
        collect(point.clientX, point.clientY, `touch-${point.identifier}`);
      }
    };
    const touchEnd = (event: TouchEvent) => {
      for (const point of event.changedTouches) pointers.delete(`touch-${point.identifier}`);
    };
    const leave = (event: PointerEvent) => { pointers.delete(`pointer-${event.pointerId}`); };
    const focus = () => {
      if (keyboardFocused()) {
        engine?.clear();
        pause(motion.matches ? "reduced-motion" : "keyboard");
      }
    };
    const visibility = () => {
      if (document.hidden) pause("hidden");
      else if (visible && !motion.matches) {
        initialize();
        if (engine) {
          engine.clear();
          state("idle");
        }
      }
    };
    const changeMotion = () => {
      if (motion.matches) {
        pause("reduced-motion");
        engine?.dispose();
        engine = null;
      } else if (visible) {
        initialize();
      }
    };
    const contextLost = (event: Event) => {
      // Required by WebGL to permit restoration; never affects input gestures.
      event.preventDefault();
      lost = true;
      pause("context-lost");
      engine?.dispose();
      engine = null;
    };
    const contextRestored = () => {
      lost = false;
      unavailable = false;
      if (motion.matches) state("reduced-motion");
      else if (visible && !document.hidden) initialize();
      else state("offscreen");
    };

    state(motion.matches ? "reduced-motion" : "dormant");
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        pause(motion.matches ? "reduced-motion" : "offscreen");
      } else if (!motion.matches && !document.hidden) {
        initialize();
        if (engine) {
          engine.clear();
          state("idle");
        }
      }
    });
    intersection.observe(footer);
    const observer = new ResizeObserver(resize);
    observer.observe(footer);
    footer.addEventListener("pointermove", input, { passive: true });
    footer.addEventListener("pointerdown", input, { passive: true });
    footer.addEventListener("pointerleave", leave, { passive: true });
    footer.addEventListener("pointerup", leave, { passive: true });
    footer.addEventListener("pointercancel", leave, { passive: true });
    footer.addEventListener("touchstart", touch, { passive: true });
    footer.addEventListener("touchmove", touch, { passive: true });
    footer.addEventListener("touchend", touchEnd, { passive: true });
    footer.addEventListener("touchcancel", touchEnd, { passive: true });
    footer.addEventListener("focusin", focus);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", changeMotion);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);

    return () => {
      disposed = true;
      pause("disposed");
      intersection.disconnect();
      observer.disconnect();
      footer.removeEventListener("pointermove", input);
      footer.removeEventListener("pointerdown", input);
      footer.removeEventListener("pointerleave", leave);
      footer.removeEventListener("pointerup", leave);
      footer.removeEventListener("pointercancel", leave);
      footer.removeEventListener("touchstart", touch);
      footer.removeEventListener("touchmove", touch);
      footer.removeEventListener("touchend", touchEnd);
      footer.removeEventListener("touchcancel", touchEnd);
      footer.removeEventListener("focusin", focus);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", changeMotion);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      engine?.dispose();
    };
  }, [footerRef, filterId]);

  return <>
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" data-footer-fluid data-fluid-frames="0" />
    <svg className={styles.filter} aria-hidden="true" focusable="false">
      <defs>
        <filter ref={filterRef} id={filterId} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage ref={mapRef} href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Cpath fill='%23808080' d='M0 0h1v1H0z'/%3E%3C/svg%3E" preserveAspectRatio="none" result="liquid-map" />
          <feDisplacementMap in="SourceGraphic" in2="liquid-map" scale="44" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  </>;
}

"use client";

/**
 * Single registration point for GSAP, per doc/MOTION_ARCHITECTURE.md.
 * Nothing else in the app should call gsap.registerPlugin().
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger, MotionPathPlugin);

// Defaults shared by every section timeline.
gsap.defaults({ ease: "power3.out", duration: 0.8 });

export { gsap, useGSAP, ScrollTrigger };

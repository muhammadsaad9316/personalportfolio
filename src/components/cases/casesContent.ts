/**
 * Case Studies content.
 *
 * Only the flagship study lives here for now. It is the study the
 * `work-to-cases` transition lands on, so its visual has to be the exact same
 * file the Work card uses — the transition moves one element between the two
 * layouts rather than swapping one image for another.
 *
 * Copy comes from `doc/simpleenglish.md`. The remaining three studies are a
 * separate, shorter pattern (see doc/MOTION_ARCHITECTURE.md) and are not built
 * yet.
 */

export const CASES_INTRO = {
  num: "03",
  label: "Case Studies",
  /** Split so the middle word can take the serif accent, as in Work. */
  headingLead: "A closer look at the",
  headingAccent: "thinking",
  headingTail: "behind the work.",
};

export type CaseStudy = {
  id: string;
  num: string;
  name: string;
  kind: string;
  intro: string;
  href: string;
  image: { src: string; width: number; height: number; sizes: string };
  imageAlt: string;
};

export const FLAGSHIP: CaseStudy = {
  id: "salam-cargo",
  num: "01",
  name: "Salam Cargo ERP",
  kind: "Cargo Management System",
  intro:
    "A system created to manage cargo operations across multiple branches.",
  href: "/work/salam-cargo-erp",
  image: {
    src: "/media/work/salam-cargo.webp",
    width: 1500,
    height: 958,
    // The desktop study crops this into a full-height, full-bleed left side.
    sizes: "(max-width: 899px) 92vw, 100vw",
  },
  imageAlt:
    "The Salam Cargo ERP company overview: weekly bookings, collections and profit, warehouse queue counts, and a branch comparison table.",
};

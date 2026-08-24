/**
 * Work section content.
 *
 * Names, kinds and summaries come from the case studies in
 * `doc/simpleenglish.md`. `image` is intentionally optional: where no real
 * screenshot exists the project falls back to a stylised inline-SVG preview.
 * Drop a file in `public/media/work/` and set `image` — nothing else needs to
 * change.
 *
 * `flagship` marks the one project whose preview is a shared element: the
 * `work-to-cases` transition moves that exact frame into the Case Studies
 * layout, so it must carry a real image that can crop cleanly into the
 * full-bleed case-study slot.
 */

export type ProjectPlacement = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

export type Project = {
  id: string;
  num: string;
  name: string;
  kind: string;
  /** One line for the preview card, drawn from the case study's result. */
  summary: string;
  href: string;
  placement: ProjectPlacement;
  /** Preview artwork variant used until a real screenshot is supplied. */
  preview: "dashboard" | "education" | "storefront" | "automotive";
  image?: { src: string; width: number; height: number; sizes: string };
  /** Empty for decorative previews; set where the image carries meaning. */
  imageAlt?: string;
  /** The one project that travels into the Case Studies layout. */
  flagship?: boolean;
};

export const PROJECTS: Project[] = [
  {
    id: "salam-cargo",
    num: "01",
    name: "Salam Cargo ERP",
    kind: "Management System",
    summary:
      "One connected system replacing separate manual workflows for bookings, payments, expenses and dispatch.",
    href: "/work/salam-cargo-erp",
    placement: "topLeft",
    preview: "dashboard",
    flagship: true,
    image: {
      /* The same file the first case-study chapter uses, and it has to be:
         the element that flies is this card's own <img>, so a different file
         here would make the landing a visible swap instead of one continuous
         object. */
      src: "/media/screenshotofSalamCargoo/01-branch-overview.png",
      width: 2800,
      height: 2640,
      /* Sized for the full-bleed state it reaches in Case Studies, not for the
         354px card it starts in — a transform never makes the browser fetch a
         larger source. There the box is 58vw wide and a full viewport tall, so
         a 2800 x 2640 image covering it is painted about `100vh * 2800/2640`
         wide. Stating it in `vh` stays correct as the viewport changes shape;
         140 also covers wide, short screens where the 58vw column wins. */
      sizes: "(max-width: 899px) 92vw, 140vh",
    },
  },
  {
    id: "time-mardan",
    num: "02",
    name: "Time Mardan",
    kind: "Education Website",
    summary:
      "Built around the questions students actually search for, with technical SEO and a clearer structure.",
    href: "/work/time-mardan",
    placement: "topRight",
    preview: "education",
  },
  {
    id: "miru-closet",
    num: "03",
    name: "Miru Closet",
    kind: "E-commerce Platform",
    summary:
      "A minimal storefront paired with a custom admin dashboard for orders and inventory.",
    href: "/work/miru-closet",
    placement: "bottomRight",
    preview: "storefront",
  },
  {
    id: "danx-detailing",
    num: "04",
    name: "Danx Detailing",
    kind: "Website Development",
    summary:
      "A premium presence where the visual quality matches the detailing service, built to generate enquiries.",
    href: "/work/danx-detailing",
    placement: "bottomLeft",
    preview: "automotive",
  },
];

/**
 * Anchor points in the connector SVG's viewBox (0 0 1000 760).
 * The viewBox is tall enough for two stacked project cards plus a gap, and
 * `.network` is locked to the same ratio so the wires, the ring and the cards
 * all agree at every width.
 */
export const CENTRE = { x: 500, y: 380, r: 86 };

/** Hub dots sit at 45 degrees, where each connector meets the ring. */
const HUB_OFF = Math.round(86 * Math.SQRT1_2);

export const CONNECTORS: Record<
  ProjectPlacement,
  {
    hub: [number, number];
    end: [number, number];
    path: string;
    fork: string;
    commits: [number, number][];
  }
> = {
  topLeft: {
    hub: [CENTRE.x - HUB_OFF, CENTRE.y - HUB_OFF],
    end: [382, 60],
    path: `M439 ${CENTRE.y - HUB_OFF} V90 A30 30 0 0 0 409 60 H382`,
    fork: "M439 190 C427 190 421 184 421 172 V162",
    commits: [[439, 250], [439, 190], [421, 162]],
  },
  topRight: {
    hub: [CENTRE.x + HUB_OFF, CENTRE.y - HUB_OFF],
    end: [618, 60],
    path: `M561 ${CENTRE.y - HUB_OFF} V90 A30 30 0 0 1 591 60 H618`,
    fork: "M561 190 C573 190 579 184 579 172 V162",
    commits: [[561, 250], [561, 190], [579, 162]],
  },
  bottomRight: {
    hub: [CENTRE.x + HUB_OFF, CENTRE.y + HUB_OFF],
    end: [618, 700],
    path: `M561 ${CENTRE.y + HUB_OFF} V670 A30 30 0 0 0 591 700 H618`,
    fork: "M561 570 C573 570 579 576 579 588 V598",
    commits: [[561, 510], [561, 570], [579, 598]],
  },
  bottomLeft: {
    hub: [CENTRE.x - HUB_OFF, CENTRE.y + HUB_OFF],
    end: [382, 700],
    path: `M439 ${CENTRE.y + HUB_OFF} V670 A30 30 0 0 1 409 700 H382`,
    fork: "M439 570 C427 570 421 576 421 588 V598",
    commits: [[439, 510], [439, 570], [421, 598]],
  },
};

/** Where the centre arrow points when a project is active. */
export const CENTRE_LEAN: Record<ProjectPlacement, { x: number; y: number; rotate: number }> = {
  topLeft: { x: -4, y: -4, rotate: -135 },
  topRight: { x: 4, y: -4, rotate: -45 },
  bottomRight: { x: 4, y: 4, rotate: 45 },
  bottomLeft: { x: -4, y: 4, rotate: 135 },
};

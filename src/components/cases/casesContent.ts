/** Content for the flagship Salam Cargo case-study chapters. */

export type CaseImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  position: string;
};

export type CaseChapter = {
  id: "intro" | "solution" | "result";
  label?: string;
  title: string;
  body?: string;
  proof?: string[];
  image: CaseImage;
};

/**
 * The supplied set in `public/media/screenshotofSalamCargoo/`.
 *
 * 2800 x 2640 — near square, and deliberately so. The desktop study crops
 * these into a slot that is 58vw wide and a full viewport tall (about 0.92:1),
 * so a near-square source only has to give up around a tenth of its width,
 * where the original 16:9 exports had to be magnified to nearly twice the
 * column width before they filled it. These numbers must match the files on
 * disk: `next/image` reserves layout from them, so a wrong pair either shifts
 * the page after load or reserves the wrong shape for the stacked mobile
 * figures.
 */
const screenshot = (
  file: string,
  alt: string,
  position = "center center",
): CaseImage => ({
  src: `/media/screenshotofSalamCargoo/${file}`,
  width: 2800,
  height: 2640,
  alt,
  position,
});

export const FLAGSHIP_CHAPTERS: CaseChapter[] = [
  {
    id: "intro",
    /* `doc/moresimple.md` originally called for the name alone here. On screen
       that left most of the right-hand column empty against a full-bleed
       visual, so Saad asked for it to carry its own weight. Kept to one line
       of context and three facts — enough to anchor the panel, not so much
       that it stops being a title card. */
    label: "Case study",
    title: "Salam Cargo ERP",
    body: "Five cargo branches worked with disconnected records. Salam Cargo ERP brings bookings, payments, dispatch and warehouse handoffs into one traceable flow.",
    proof: ["Management system", "Five branches", "Booking to delivery"],
    image: screenshot(
      "01-branch-overview.png",
      "Salam Cargo ERP branch overview showing collections, bookings, cargo weight, balances, and recent activity.",
      "left center",
    ),
  },
  {
    id: "solution",
    label: "The solution",
    title: "Every booking. Every handoff. One system.",
    body: "I mapped the booking-to-delivery journey and created shared statuses and role-aware workflows. The ERP connects bookings, dispatch, warehouse arrivals, payments and expenses.",
    proof: ["Branch → warehouse", "Booking → payment"],
    image: screenshot(
      "05-arrival-management.png",
      "Arrival management workspace tracking dispatched trucks, pending cargo, and completed warehouse receipts.",
      "40% center",
    ),
  },
  {
    id: "result",
    label: "The result",
    title: "One clear picture of the whole business.",
    body: "Teams can trace daily work without switching systems, while leadership can see branch performance, cash movement, and operational risk without stitching reports together.",
    proof: ["527 weekly bookings", "One source of truth"],
    image: screenshot(
      "03-expenses.png",
      "Expenses workspace summarizing branch spending, categories, transactions, and the people responsible.",
      "42% center",
    ),
  },
];

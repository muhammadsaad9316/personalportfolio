/**
 * Where the closing sections point.
 *
 * ────────────────────────────────────────────────────────────────────────
 *  Set the variables listed in .env.example in .env.local or hosting settings.
 *  The fallback values remain PLACEHOLDERS until real details are supplied.
 *  They are deliberately obvious rather than plausible, so a forgotten one
 *  fails loudly in review instead of quietly shipping a dead link.
 * ────────────────────────────────────────────────────────────────────────
 */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "your-email@example.com";

export const SOCIAL_LINKS = [
  { label: "LinkedIn", href: process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://www.linkedin.com/in/your-handle" },
  { label: "GitHub", href: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/your-handle" },
  { label: "Email", href: `mailto:${CONTACT_EMAIL}` },
] as const;

/**
 * Footer navigation.
 *
 * Only sections that exist. `doc/moresimple.md` also lists **About**, which is
 * not built yet — a link to a missing anchor would scroll nowhere, so it is
 * left out until there is something to point at.
 *
 * Work and Case Studies both live inside the cinematic stage, where every
 * position is a gesture-held rest. A plain `#hash` jump would drop the page
 * between rests and soft-lock it (doc/WORK_TO_CASES.md §10), so the footer
 * routes them through the stage's own beats instead — see `SiteFooter.tsx`.
 */
export const NAV_LINKS = [
  { label: "Work", href: "#work", beat: "work" as const },
  { label: "Case Studies", href: "#case-studies", beat: "cases" as const },
  { label: "Contact", href: "#contact", beat: "contact" as const },
];

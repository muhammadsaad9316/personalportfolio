import Image from "next/image";
import { CASES_INTRO, FLAGSHIP } from "./casesContent";
import styles from "./Cases.module.css";

/**
 * Case Studies — structure and content only.
 *
 * The `work-to-cases` timeline in `src/components/experience/workToCases.ts`
 * owns every transform and fade in here, through `[data-cases-in]`. The left
 * side is a measured, full-bleed slot on the cinematic path: the Salam Cargo
 * frame travels out of the Work card and lands on it, so the visual is one
 * continuous element rather than a second copy.
 *
 * The slot still renders the image for touch, narrow windows and reduced
 * motion, where nothing travels. CSS — not JS — decides which mode is showing.
 */
export default function CaseStudies() {
  return (
    <section
      id="case-studies"
      className={styles.cases}
      aria-labelledby="cases-heading"
      data-cases
    >
      <div className={styles.panel}>
        <div className={styles.copy}>
          <p className={styles.eyebrow} data-cases-in="title">
            <span className={styles.eyebrowNum}>{CASES_INTRO.num}</span>
            <span className={styles.eyebrowSlash}>/</span>
            {CASES_INTRO.label}
          </p>

          <h2
            id="cases-heading"
            className={styles.heading}
            data-cases-in="title"
          >
            {CASES_INTRO.headingLead}{" "}
            <em className={styles.headingAccent}>
              {CASES_INTRO.headingAccent}
            </em>{" "}
            {CASES_INTRO.headingTail}
          </h2>

          <article className={styles.study}>
            <p className={styles.studyNum} data-cases-in="study">
              {FLAGSHIP.num} <span className={styles.eyebrowSlash}>/</span> Case
              Study
            </p>

            <h3 className={styles.studyName} data-cases-in="study">
              {FLAGSHIP.name}
            </h3>

            <p className={styles.studyKind} data-cases-in="study">
              {FLAGSHIP.kind}
            </p>

            <p className={styles.studyIntro} data-cases-in="study">
              {FLAGSHIP.intro}
            </p>
          </article>
        </div>

        <div className={styles.visual} data-case-slot>
          <Image
            className={styles.visualImage}
            src={FLAGSHIP.image.src}
            alt={FLAGSHIP.imageAlt}
            width={FLAGSHIP.image.width}
            height={FLAGSHIP.image.height}
            sizes={FLAGSHIP.image.sizes}
          />
        </div>
      </div>
    </section>
  );
}

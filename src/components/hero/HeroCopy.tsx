import styles from "./Hero.module.css";

export default function HeroCopy() {
  return (
    <div className={styles.copy}>
      <div className={styles.copyExit} data-hero-fade data-exit="up">
        <div
          className={styles.layer}
          data-depth="0.22"
          data-side="design"
          data-quiet="0.16"
        >
          <p className={styles.eyebrow} data-reveal="copy">
            Designer <span aria-hidden="true">×</span> Developer
          </p>

          <h1 className={styles.headline}>
            <span className={styles.lineMask}>
              <span className={styles.line} data-line>
                I design
              </span>
            </span>
            <span className={styles.lineMask}>
              <span className={`${styles.line} ${styles.accentLine}`} data-line>
                beautiful
              </span>
            </span>
            <span className={styles.lineMask}>
              <span className={styles.line} data-line>
                experiences
              </span>
            </span>
            <span className={styles.lineMask}>
              <span className={styles.line} data-line>
                and build
              </span>
            </span>
            <span className={styles.lineMask}>
              <span className={styles.line} data-line>
                <em className={styles.accentLine}>solid</em> products.
              </span>
            </span>
          </h1>

          <p className={styles.lede} data-reveal="copy">
            I turn ideas into intuitive interfaces and powerful products that
            make an impact.
          </p>

          <div className={styles.ctaRow} data-reveal="copy">
            <a className={styles.cta} href="#work">
              Explore My Work
              <svg
                className={styles.ctaArrow}
                viewBox="0 0 24 24"
                width="18"
                height="18"
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
          </div>
        </div>
      </div>
    </div>
  );
}

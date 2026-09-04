import styles from "./Ending.module.css";

const METHOD = ["Understand deeply.", "Design clearly.", "Build properly."];

/** The first of the two closing panels. Motion belongs to Experience. */
export default function Ending() {
  return (
    <section
      id="ending"
      className={styles.ending}
      aria-label="How I approach projects"
      data-closing-panel="ending"
    >
      <div className={styles.outer} data-closing-outer>
        <div className={styles.curtainInner} data-closing-inner>
          <div className={styles.surface} data-closing-surface>
            <div className={styles.content}>
              <p className={styles.eyebrow} data-closing-copy>
                A consistent way of working
              </p>

              <h2
                className={styles.head}
                data-closing-heading
                tabIndex={-1}
              >
                <span className={styles.line}>Different problems.</span>
                <span className={`${styles.line} ${styles.lineTwo}`}>
                  <em>Same</em> approach.
                </span>
              </h2>

              <ol className={styles.method} aria-label="My three-part method">
                {METHOD.map((part, index) => (
                  <li key={part} className={styles.part} data-closing-copy>
                    <span className={styles.number} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{part}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

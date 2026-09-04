import { CONTACT_EMAIL } from "./siteLinks";
import styles from "./Contact.module.css";

/** The final invitation. Motion belongs to the shared closing transition. */
export default function Contact() {
  return (
    <section
      id="contact"
      className={styles.contact}
      aria-label="Contact"
      data-closing-panel="contact"
    >
      <div className={styles.outer} data-closing-outer>
        <div className={styles.curtainInner} data-closing-inner>
          <div className={styles.surface} data-closing-surface>
            <div className={styles.content}>
              <p className={styles.eyebrow} data-closing-copy>
                Before you go
              </p>

              <h2
                className={styles.head}
                data-closing-heading
                tabIndex={-1}
              >
                <span>One last</span> <em>thing.</em>
              </h2>

              <div className={styles.copy}>
                <p className={styles.lead} data-closing-copy>
                  Good ideas deserve to be built properly.
                </p>

                <p className={styles.note} data-closing-copy>
                  If you have an idea or project, I&rsquo;d like to hear about
                  it.
                </p>
              </div>

              <a
                className={styles.cta}
                href={`mailto:${CONTACT_EMAIL}`}
                data-closing-copy
              >
                <span>Tell me about your project</span>
                <span className={styles.ctaArrow} aria-hidden="true">
                  &#8599;
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

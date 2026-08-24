import { initialChartPath } from "./heroAmbient";
import { CHART_SERIES, TYPE_SPECS } from "./heroContent";
import styles from "./Hero.module.css";

const WIRE_BARS = 6;

/** Designer-side artefacts. Each item is a GSAP pointer layer wrapping a GSAP
 *  reveal layer wrapping a static CSS surface — one owner per property. */
export default function DesignCluster() {
  return (
    <div className={styles.designCluster} aria-hidden="true" data-hero-fade data-exit="left">
      <div className={styles.layer} data-depth="1.15" data-side="design" data-quiet="0.6">
        <div className={styles.reveal} data-reveal="card">
          <article className={`${styles.card} ${styles.cardDashboard}`}>
            <p className={styles.cardTitle}>Dashboard</p>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Overview</span>
              <span className={styles.pill}>
                <span className={styles.liveDotInk} data-live-dot />
                Live
              </span>
            </div>
            <svg className={styles.chart} viewBox="0 0 200 56">
              <path
                data-chart
                d={initialChartPath()}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                data-chart-marker
                className={styles.chartMarker}
                r="3.4"
                cx="4"
                cy="28"
              />
            </svg>
            <p className={styles.metric} data-metric>
              + {CHART_SERIES[0].delta.toFixed(1)}%
            </p>
            <p className={styles.metricNote}>vs last month</p>
          </article>
        </div>
      </div>

      <div className={styles.layer} data-depth="0.7" data-side="design" data-quiet="0.58">
        <div className={styles.reveal} data-reveal="card">
          <article className={`${styles.card} ${styles.cardType}`}>
            <p className={styles.typeSample} data-type-sample>
              Aa
            </p>
            <p className={styles.typeName} data-type-label>
              {TYPE_SPECS[0].label}
            </p>
            <div className={styles.swatchRow}>
              <span className={styles.swatchRing} data-swatch-ring />
              <ul className={styles.swatches}>
                <li className={styles.swatchInk} data-swatch />
                <li className={styles.swatchInk} data-swatch />
                <li className={styles.swatchInk} data-swatch />
                <li className={styles.swatchAccent} data-swatch />
                <li className={styles.swatchLight} data-swatch />
              </ul>
            </div>
          </article>
        </div>
      </div>

      <div className={styles.layer} data-depth="1.45" data-side="design" data-quiet="0.62">
        <div className={styles.reveal} data-reveal="card">
          <article className={`${styles.card} ${styles.cardWire}`}>
            <span className={styles.wireDots}>
              <i />
              <i />
              <i />
            </span>
            <div className={styles.wireBody}>
              <div className={styles.wireCol}>
                <span className={styles.wireBox}>
                  <svg viewBox="0 0 40 28" preserveAspectRatio="none">
                    <path
                      d="M0 0l40 28M40 0L0 28"
                      stroke="currentColor"
                      strokeWidth="0.8"
                    />
                  </svg>
                </span>
                <span className={styles.wireBox}>
                  <svg viewBox="0 0 40 28" preserveAspectRatio="none">
                    <path
                      d="M0 0l40 28M40 0L0 28"
                      stroke="currentColor"
                      strokeWidth="0.8"
                    />
                  </svg>
                </span>
              </div>
              <div className={styles.wireCol}>
                {Array.from({ length: WIRE_BARS }, (_, i) => (
                  <span key={i} className={styles.wireBar} data-wire-bar />
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>

      <div className={styles.layer} data-depth="0.45" data-side="design" data-quiet="0.72">
        <div className={styles.reveal} data-reveal="card">
          <div className={styles.dotGrid}>
            <span className={styles.dotSweep} data-dot-sweep />
          </div>
        </div>
      </div>
    </div>
  );
}

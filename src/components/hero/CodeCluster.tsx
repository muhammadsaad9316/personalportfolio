import { CODE_LINES } from "./heroContent";
import styles from "./Hero.module.css";

const KIND_CLASS: Record<string, string> = {
  kw: styles.tKw,
  var: styles.tVar,
  key: styles.tKey,
  str: styles.tStr,
  fn: styles.tFn,
  punc: styles.tPunc,
};

const INDENT_CLASS = [undefined, styles.indent1, styles.indent2];

/**
 * The developer side is one thing only: code that writes itself. It is
 * server-rendered complete and then re-typed live by GSAP, so the markup
 * stays readable before hydration and with JavaScript disabled.
 */
export default function CodeCluster() {
  return (
    <div className={styles.codeCluster} aria-hidden="true" data-hero-fade data-exit="right">
      <div
        className={styles.layer}
        data-depth="0.5"
        data-side="code"
        data-quiet="0.5"
      >
        <pre className={styles.code} data-reveal="code">
          <code>
            {CODE_LINES.map((line, i) => (
              <span
                key={i}
                className={styles.codeLine}
                data-code-line
                data-line-index={i}
              >
                <span className={styles.lineNo} data-gutter>
                  {line.no}
                </span>
                {line.indent ? (
                  <span className={INDENT_CLASS[line.indent]} />
                ) : null}
                {line.tokens.map((token, j) => (
                  <span
                    key={j}
                    className={token.k ? KIND_CLASS[token.k] : undefined}
                    data-token
                    data-line-index={i}
                  >
                    {token.t}
                  </span>
                ))}
              </span>
            ))}
          </code>
          <span className={styles.caret} data-caret />
        </pre>
      </div>
    </div>
  );
}

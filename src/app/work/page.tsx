import type { Metadata } from "next";
import ProjectPreview from "@/components/work/ProjectPreview";
import { PROJECTS } from "@/components/work/workContent";
import styles from "./[slug]/Study.module.css";
import { siteMetadata } from "@/lib/siteMetadata";

export const metadata: Metadata = siteMetadata(
  "Selected work — Abdullah",
  "Digital products. Real impact. A closer look at the thinking behind the work.",
  "/work",
);

export default function WorkPage() {
  return (
    <main id="main" className={styles.page}>
      <nav className={styles.nav} aria-label="Project navigation">
        <a className={styles.brand} href="/" aria-label="Abdullah — home">Abdullah<span>.</span></a>
        <a href="/">Portfolio <span aria-hidden="true">↗</span></a>
        <a href="/#contact">Let’s talk <span aria-hidden="true">↗</span></a>
      </nav>

      <header className={styles.header}>
        <p className={styles.label}>Selected work <span>Design × Development</span></p>
        <h1>Digital products.<br /><em className={styles.accent}>Real impact.</em></h1>
        <p className={styles.lede}>A closer look at the thinking behind the work.</p>
      </header>

      <ul className={styles.projectGrid}>
        {PROJECTS.map((project) => (
          <li key={project.id}>
            <a className={styles.project} href={project.href}>
              <div className={styles.indexPreview}><ProjectPreview project={project} /></div>
              <p className={styles.label}>{project.num} / {project.kind}<span aria-hidden="true">↗</span></p>
              <h2>{project.name}</h2>
              <p className={styles.summary}>{project.summary}</p>
              <span className={styles.readStudy}>View case study <span aria-hidden="true">↗</span></span>
            </a>
          </li>
        ))}
      </ul>

      <footer className={styles.footer}>
        <a href="/"><span aria-hidden="true">←</span> Back to portfolio</a>
        <a href="/#contact">Tell me about your project <span aria-hidden="true">↗</span></a>
      </footer>
    </main>
  );
}

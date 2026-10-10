import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectPreview from "@/components/work/ProjectPreview";
import { PROJECTS } from "@/components/work/workContent";
import styles from "./Study.module.css";
import { siteMetadata } from "@/lib/siteMetadata";

// Short case studies supplied in doc/simpleenglish.md.
const STUDIES = [
  {
    slug: "time-mardan",
    discipline: "Education website + SEO",
    problem:
      "The institute needed a clearer online presence and better visibility for people searching for English and IELTS courses.",
    approach:
      "Build the site around the actual questions potential students search for.",
    solution: [
      "Clearer website structure and course-focused pages",
      "Responsive design and performance improvements",
      "Technical SEO and content structure",
    ],
    result:
      "Better search visibility and a more useful website for potential students.",
  },
  {
    slug: "miru-closet",
    discipline: "E-commerce + admin",
    problem:
      "The store needed a clean e-commerce presence with an intuitive admin system to manage products, inventory, and orders smoothly.",
    approach:
      "Design a minimal, fashion-forward storefront paired with a streamlined backend management dashboard.",
    solution: [
      "A minimal storefront, product catalog and filtering",
      "A responsive checkout experience",
      "A custom dashboard for orders and inventory",
      "Fast performance and optimized image loading",
    ],
    result:
      "A refined digital boutique that balances high-end presentation with straightforward store management.",
  },
  {
    slug: "danx-detailing",
    discipline: "Business website",
    problem: "The business needed a stronger premium online presence.",
    approach:
      "Make the visual quality of the website reflect the quality of the detailing service.",
    solution: [
      "Strong visual hierarchy and focused service pages",
      "A mobile experience with clear calls to action",
      "A clean, responsive implementation with fast performance",
    ],
    result:
      "A more professional digital presence built around generating enquiries.",
  },
];

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STUDIES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((project) => project.id === slug);
  return siteMetadata(
    project ? `${project.name} — Abdullah` : "Project not found — Abdullah",
    project?.summary ?? "",
    `/work/${slug}`,
  );
}

export default async function StudyPage({ params }: Props) {
  const { slug } = await params;
  const study = STUDIES.find((study) => study.slug === slug);
  const project = PROJECTS.find((project) => project.id === slug);
  if (!study || !project) notFound();

  return (
    <main id="main" className={styles.page}>
      <nav className={styles.nav} aria-label="Project navigation">
        <a className={styles.brand} href="/" aria-label="Abdullah — home">Abdullah<span>.</span></a>
        <a href="/work">All projects <span aria-hidden="true">↗</span></a>
        <a href="/#contact">Let’s talk <span aria-hidden="true">↗</span></a>
      </nav>

      <header className={styles.header}>
        <p className={styles.label}>{project.num} / Case study <span>{study.discipline}</span></p>
        <h1>{project.name}</h1>
        <p className={styles.lede}>{project.summary}</p>
      </header>

      <div className={styles.story}>
        <figure className={styles.visual}>
          <div className={styles.preview}><ProjectPreview project={project} /></div>
          <figcaption><span>{project.name}</span><span>Interface illustration</span></figcaption>
        </figure>

        <div className={styles.chapters}>
          <section>
            <h2><span>01</span>The problem</h2>
            <p>{study.problem}</p>
          </section>
          <section>
            <h2><span>02</span>The approach</h2>
            <p>{study.approach}</p>
          </section>
          <section>
            <h2><span>03</span>The solution</h2>
            <ul>{study.solution.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>
      </div>

      <section className={styles.result} aria-labelledby="result-heading">
        <h2 id="result-heading" className={styles.label}>04 / The result</h2>
        <p>{study.result}</p>
      </section>

      <footer className={styles.footer}>
        <a href="/work"><span aria-hidden="true">←</span> Back to all projects</a>
        <a href="/#contact">Tell me about your project <span aria-hidden="true">↗</span></a>
      </footer>
    </main>
  );
}

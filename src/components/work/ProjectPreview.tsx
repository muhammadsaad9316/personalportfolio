import Image from "next/image";
import type { Project } from "./workContent";
import styles from "./Work.module.css";

/**
 * Preview artwork for a project card.
 *
 * Renders the real screenshot when `project.image` is set; otherwise draws a
 * stylised inline-SVG stand-in matching the product type. These are
 * deliberately abstract — they read as diagrams, not as fake screenshots of a
 * real client site.
 */
export default function ProjectPreview({ project }: { project: Project }) {
  if (project.image) {
    return (
      <Image
        className={styles.previewImage}
        src={project.image.src}
        alt={project.imageAlt ?? ""}
        width={project.image.width}
        height={project.image.height}
        sizes={project.image.sizes}
      />
    );
  }

  return (
    <svg
      className={styles.previewArt}
      viewBox="0 0 360 230"
      role="presentation"
      focusable="false"
    >
      {project.preview === "dashboard" && <DashboardArt />}
      {project.preview === "education" && <EducationArt />}
      {project.preview === "storefront" && <StorefrontArt />}
      {project.preview === "automotive" && <AutomotiveArt />}
    </svg>
  );
}

function DashboardArt() {
  return (
    <g>
      <rect width="360" height="230" rx="8" className={styles.artSurface} />
      <rect width="74" height="230" rx="8" className={styles.artRail} />
      <rect x="12" y="18" width="46" height="7" rx="3.5" className={styles.artRailMark} />
      {[46, 66, 86, 106, 126].map((y) => (
        <rect key={y} x="12" y={y} width="40" height="5" rx="2.5" className={styles.artRailLine} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={90 + i * 66} y="20" width="56" height="40" rx="5" className={styles.artTile} />
          <rect x={98 + i * 66} y="30" width="30" height="8" rx="4" className={styles.artStrong} />
          <rect x={98 + i * 66} y="44" width="20" height="5" rx="2.5" className={styles.artFaint} />
        </g>
      ))}
      <rect x="90" y="72" width="158" height="140" rx="6" className={styles.artTile} />
      <polyline
        points="102,182 124,166 146,172 168,144 190,152 212,120 234,128"
        className={styles.artChart}
      />
      <rect x="258" y="72" width="90" height="140" rx="6" className={styles.artTile} />
      {[86, 116, 146, 176].map((y) => (
        <g key={y}>
          <rect x="268" y={y} width="52" height="6" rx="3" className={styles.artStrong} />
          <rect x="268" y={y + 11} width="34" height="4" rx="2" className={styles.artFaint} />
        </g>
      ))}
    </g>
  );
}

function EducationArt() {
  return (
    <g>
      <rect width="360" height="230" rx="8" className={styles.artSurface} />
      <rect width="360" height="30" rx="8" className={styles.artBar} />
      <rect x="14" y="11" width="52" height="8" rx="4" className={styles.artStrong} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={190 + i * 34} y="12" width="24" height="5" rx="2.5" className={styles.artFaint} />
      ))}
      <rect x="18" y="52" width="120" height="11" rx="5.5" className={styles.artStrong} />
      <rect x="18" y="70" width="150" height="11" rx="5.5" className={styles.artAccent} />
      {[94, 108, 122].map((y) => (
        <rect key={y} x="18" y={y} width={y === 122 ? 96 : 140} height="5" rx="2.5" className={styles.artFaint} />
      ))}
      <rect x="18" y="140" width="66" height="20" rx="5" className={styles.artAccentSolid} />
      <rect x="192" y="48" width="152" height="112" rx="6" className={styles.artTile} />
      <path d="M206 150 L246 104 L272 134 L294 112 L330 150 Z" className={styles.artFigure} />
      <circle cx="308" cy="76" r="11" className={styles.artFigure} />
      <rect y="176" width="360" height="54" className={styles.artBand} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={24 + i * 86} y="190" width="34" height="10" rx="5" className={styles.artBandStrong} />
          <rect x={24 + i * 86} y="206" width="52" height="5" rx="2.5" className={styles.artBandFaint} />
        </g>
      ))}
    </g>
  );
}

function StorefrontArt() {
  return (
    <g>
      <rect width="360" height="230" rx="8" className={styles.artSurface} />
      <rect width="360" height="28" rx="8" className={styles.artBar} />
      <rect x="14" y="10" width="58" height="8" rx="4" className={styles.artStrong} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={214 + i * 30} y="11" width="20" height="5" rx="2.5" className={styles.artFaint} />
      ))}
      <circle cx="330" cy="14" r="6" className={styles.artAccentSolid} />
      <rect x="20" y="48" width="44" height="9" rx="4.5" className={styles.artAccent} />
      <rect x="20" y="68" width="118" height="12" rx="6" className={styles.artStrong} />
      <rect x="20" y="88" width="92" height="12" rx="6" className={styles.artStrong} />
      <rect x="20" y="112" width="126" height="5" rx="2.5" className={styles.artFaint} />
      <rect x="20" y="136" width="76" height="20" rx="4" className={styles.artInk} />
      <rect x="176" y="42" width="168" height="132" rx="6" className={styles.artTile} />
      <path d="M244 66 L276 78 L268 96 L256 92 V150 H232 V92 L220 96 L212 78 Z" className={styles.artFigure} />
      <rect y="188" width="360" height="42" className={styles.artBandLight} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={38 + i * 116} cy="209" r="8" className={styles.artFaintSolid} />
          <rect x={54 + i * 116} y="200" width="54" height="6" rx="3" className={styles.artStrong} />
          <rect x={54 + i * 116} y="212" width="40" height="4" rx="2" className={styles.artFaint} />
        </g>
      ))}
    </g>
  );
}

function AutomotiveArt() {
  return (
    <g>
      <rect width="360" height="230" rx="8" className={styles.artSurfaceDark} />
      <rect x="16" y="14" width="52" height="8" rx="4" className={styles.artDarkStrong} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={176 + i * 34} y="15" width="24" height="5" rx="2.5" className={styles.artDarkFaint} />
      ))}
      <rect x="308" y="9" width="40" height="18" rx="4" className={styles.artAccentSolid} />
      <rect x="22" y="62" width="126" height="12" rx="6" className={styles.artDarkStrong} />
      <rect x="22" y="82" width="98" height="12" rx="6" className={styles.artDarkStrong} />
      {[108, 120].map((y) => (
        <rect key={y} x="22" y={y} width={y === 108 ? 122 : 84} height="5" rx="2.5" className={styles.artDarkFaint} />
      ))}
      <rect x="22" y="146" width="70" height="20" rx="4" className={styles.artAccentSolid} />
      <path
        d="M186 168 Q194 136 226 130 L262 126 Q292 124 312 142 L338 150 Q346 154 344 166 L344 174 H186 Z"
        className={styles.artCar}
      />
      <circle cx="226" cy="176" r="19" className={styles.artWheel} />
      <circle cx="226" cy="176" r="8" className={styles.artWheelHub} />
      <circle cx="316" cy="176" r="19" className={styles.artWheel} />
      <circle cx="316" cy="176" r="8" className={styles.artWheelHub} />
      <path d="M196 200 Q262 210 336 200" className={styles.artGleam} />
    </g>
  );
}

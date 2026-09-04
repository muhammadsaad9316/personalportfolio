import Experience from "@/components/experience/Experience";
import SiteFooter from "@/components/footer/SiteFooter";

/**
 * Experience owns the cinematic story through Contact. The footer is the first
 * ordinary-flow surface after the gesture-held stage.
 */
export default function Page() {
  return (
    <main id="main">
      <Experience />
      <SiteFooter />
    </main>
  );
}

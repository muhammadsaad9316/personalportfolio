import Experience from "@/components/experience/Experience";
import SiteFooter from "@/components/footer/SiteFooter";
import SmoothScroll from "@/components/SmoothScroll";

/**
 * Experience owns the cinematic story through Contact. The footer is the first
 * ordinary-flow surface after the gesture-held stage.
 */
export default function Page() {
  return (
    <>
      <SmoothScroll />
      <main id="main">
        <Experience />
      </main>
      <SiteFooter />
    </>
  );
}

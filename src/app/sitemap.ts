import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/siteMetadata";
import { PROJECTS } from "@/components/work/workContent";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];
  return ["/", "/work", ...PROJECTS.filter(project => project.href.startsWith("/work/")).map(project => project.href)]
    .map(path => ({ url: new URL(path, origin).href }));
}

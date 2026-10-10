import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/siteMetadata";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return { rules: { userAgent: "*", allow: "/" }, ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}) };
}

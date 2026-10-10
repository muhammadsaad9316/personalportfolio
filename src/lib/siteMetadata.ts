import type { Metadata } from "next";

export function siteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!value) return undefined;
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (!/^https?:$/.test(url.protocol)) throw new Error("The site URL must use http or https.");
  return url.origin;
}

export function siteMetadata(title: string, description: string, path = "/"): Metadata {
  const origin = siteOrigin();
  const url = origin ? new URL(path, origin).href : undefined;
  const image = origin ? new URL("/opengraph-image", origin).href : undefined;
  return {
    title,
    description,
    ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: url } } : {}),
    openGraph: { title, description, url, siteName: "Abdullah — Designer × Developer", type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: "Abdullah — Designer × Developer" }] } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
  };
}

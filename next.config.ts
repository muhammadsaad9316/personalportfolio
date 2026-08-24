import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [75, 88],
    /* Default set plus 2560. The flagship case-study visual is a dense UI
       screenshot shown `object-fit: cover` in a tall box, so at a 1440 x 900
       viewport it is painted about 1600 CSS px wide — 2400 device px at the
       1.5x scaling most Windows laptops run. Without a 2560 step the browser
       has to choose between 2048 (too soft) and 3840 (twice the bytes it
       needs). */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Data CSV di folder data/ dibaca server lewat fs (lib/data/statis.ts).
  // Tanpa ini, file tidak ikut ter-deploy ke Vercel.
  outputFileTracingIncludes: {
    "/api/**": ["./data/**/*.csv"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

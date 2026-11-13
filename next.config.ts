import type { NextConfig } from "next";

// Deployed (Vercel), the app lives at nordlyssolutions.com/uk (official) or /uk/demo (the demo project sets
// UK_BASE_PATH=/uk/demo). The Nordlys site proxies that path to this
// deployment, so its pages and /uk/_next assets all sit under /uk. Locally it's the root.
const BASE_PATH = process.env.VERCEL ? (process.env.UK_BASE_PATH ?? "/uk") : ""

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  async redirects() {
    // The bare deployment address opens the app
    return BASE_PATH ? [{ source: "/", destination: BASE_PATH, permanent: false, basePath: false as const }] : []
  },
  // The root layout reads the language cookie and every page reads the database, so pages render per request.
  cacheComponents: false,
  partialPrefetching: false,
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

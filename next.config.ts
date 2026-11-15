import type { NextConfig } from "next";

// Deployed (Vercel), the app lives at nordlyssolutions.com/uk (official) or /uk/demo (the demo project sets
// UK_BASE_PATH=/uk/demo). The Nordlys site proxies that path to this deployment, so its pages and
// /uk/_next assets all sit under /uk.
// Locally (`npm run dev`, see scripts/dev.mjs) the live app is at the root and the demo at /demo: a second
// dev server with UK_BASE_PATH=/demo, which the root one passes /demo requests on to.
const BASE_PATH = process.env.VERCEL ? (process.env.UK_BASE_PATH ?? "/uk") : (process.env.UK_BASE_PATH ?? "")
const LOCAL_DEMO = "http://localhost:3001"

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  // The two local dev servers each need their own build folder
  distDir: process.env.UK_DIST_DIR ?? ".next",
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  async redirects() {
    // The bare deployment address opens the app
    return BASE_PATH ? [{ source: "/", destination: BASE_PATH, permanent: false, basePath: false as const }] : []
  },
  async rewrites() {
    // Local root app: /demo is the demo dev server
    return !process.env.VERCEL && !BASE_PATH && process.env.UK_LOCAL_SITE === "live"
      ? [
          { source: "/demo", destination: `${LOCAL_DEMO}/demo` },
          { source: "/demo/:path*", destination: `${LOCAL_DEMO}/demo/:path*` },
        ]
      : []
  },
  // The root layout reads the language cookie and every page reads the database, so pages render per request.
  cacheComponents: false,
  partialPrefetching: false,
  // Keep visited/prefetched pages in the browser for 10 min, so going back to a page is instant
  // with no database trip. Every save/delete/undo calls revalidatePath, which clears this cache.
  experimental: { staleTimes: { dynamic: 600, static: 600 } },
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

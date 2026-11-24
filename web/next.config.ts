import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.CARQ_E2E === "1" ? ".next-e2e" : ".next",
  typescript: {
    tsconfigPath: process.env.CARQ_E2E === "1" ? "tsconfig.e2e.json" : "tsconfig.json",
  },
  // Docker empaqueta standalone; en Windows el build local no requiere enlaces.
  output: process.env.CARQ_STANDALONE === "1" ? "standalone" : undefined,
};

export default nextConfig;

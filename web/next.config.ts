import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker empaqueta standalone; en Windows el build local no requiere enlaces.
  output: process.env.CARQ_STANDALONE === '1' ? 'standalone' : undefined,
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set the workspace root so Next.js doesn't pick up stray
    // lockfiles from parent directories on this machine.
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [];
  },
};

export default nextConfig;

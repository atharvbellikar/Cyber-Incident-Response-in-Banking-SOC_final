import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't mis-detect it from a stray
  // parent lockfile (which produced the "inferred workspace root" warning).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

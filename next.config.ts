import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root so Turbopack doesn't infer it from a parent
    // directory's lockfile (multiple projects/lockfiles live above this one).
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

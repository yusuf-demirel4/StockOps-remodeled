import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stockops/core", "@stockops/db"],
};

export default nextConfig;

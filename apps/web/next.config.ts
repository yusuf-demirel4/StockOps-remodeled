import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@stockops/core", "@stockops/db"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);

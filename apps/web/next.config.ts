import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@stockops/core", "@stockops/db"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);

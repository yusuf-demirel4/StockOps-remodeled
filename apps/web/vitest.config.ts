import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@stockops/core": path.resolve(__dirname, "../../packages/core/src"),
      "@stockops/db": path.resolve(__dirname, "../../packages/db/src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

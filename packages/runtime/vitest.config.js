import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts"],
    reporters: "verbose",
    environment: "jsdom",
    testTimeout: 2000,
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    env: {
      BASE_URL: process.env.BASE_URL ?? "http://localhost:4300",
    },
  },
});

import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "supabase/tests/**/*.test.mjs"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

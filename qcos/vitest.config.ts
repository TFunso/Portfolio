import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Resolve the app's "@/..." import alias (tsconfig paths) in tests, so
// modules that import each other through it - e.g. the classifier - load.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});

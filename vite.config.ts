import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // "@/..." points at src/ (mirrored in tsconfig.json "paths"); Vitest uses the same config.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/freezeDate.ts", "./src/test/setup.ts"],
    css: true,
    testTimeout: 15000,
  },
});

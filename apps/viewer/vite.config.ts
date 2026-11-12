import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    fs: {
      allow: ["../.."],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});

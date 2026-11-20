import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    fs: {
      allow: ["../.."],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  envDir: "../..",
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.ts"],
  },
});

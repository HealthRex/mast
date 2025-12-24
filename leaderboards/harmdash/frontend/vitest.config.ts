import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"]
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "chart.js": new URL("./src/test-utils/chartjs-mock.ts", import.meta.url)
        .pathname,
      "react-chartjs-2": new URL(
        "./src/test-utils/react-chartjs-2-mock.tsx",
        import.meta.url
      ).pathname
    }
  }
});

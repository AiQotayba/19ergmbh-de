import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const monorepoRoot = fileURLToPath(new URL("../..", import.meta.url));
  const apiRoot = fileURLToPath(new URL("../api", import.meta.url));

  const rootEnv = loadEnv(mode, monorepoRoot, "");
  const apiEnv = loadEnv(mode, apiRoot, "");

  const apiPort = apiEnv.API_PORT || rootEnv.API_PORT || "3002";
  const apiTarget =
    apiEnv.API_URL || rootEnv.API_URL || `http://localhost:${apiPort}`;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5174,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});

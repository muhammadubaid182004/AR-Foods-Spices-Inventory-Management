import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const parsedPort = rawPort ? Number(rawPort) : undefined;
const port =
  parsedPort !== undefined && Number.isFinite(parsedPort) && parsedPort > 0
    ? parsedPort
    : 5173;
const basePath = process.env.BASE_PATH ?? "/";
const apiPort = process.env.API_PORT ?? "3000";

export default defineConfig({
  base: basePath,
  plugins: [
    {
      name: "log-dev-links",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          console.log(`Client: http://localhost:${port}`);
          console.log(`API Proxy: http://localhost:${apiPort}/api`);
        });
      },
    },
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      "@workspace/api-client-react": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "lib",
        "api-client-react",
        "src",
        "index.ts",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "..", "..", "dist", "public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

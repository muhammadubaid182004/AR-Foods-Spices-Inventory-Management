import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import express from "express";
import { createApp } from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["API_PORT"] ?? process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const projectRoot = process.cwd();
const clientDir = path.resolve(projectRoot, "artifacts", "my-app");
const publicDir = path.resolve(projectRoot, "dist", "public");
const appUrl = `http://localhost:${port}`;
const apiUrl = `${appUrl}/api`;

const app = createApp();
const httpServer = createServer(app);

if (process.env.NODE_ENV === "production") {
  app.use(
    express.static(publicDir, {
      index: false,
    }),
  );

  app.get("/{*path}", async (_req, res, next) => {
    try {
      const indexHtml = await fs.readFile(path.resolve(publicDir, "index.html"), "utf8");
      res.status(200).type("html").send(indexHtml);
    } catch (error) {
      next(error);
    }
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    appType: "custom",
    base: "/",
    configFile: path.resolve(clientDir, "vite.config.ts"),
    root: clientDir,
    server: {
      middlewareMode: true,
      hmr: {
        server: httpServer,
      },
    },
  });

  app.use(vite.middlewares);
  app.get("/{*path}", async (req, res, next) => {
    try {
      const indexTemplate = await fs.readFile(path.resolve(clientDir, "index.html"), "utf8");
      const html = await vite.transformIndexHtml(req.originalUrl, indexTemplate);
      res.status(200).type("html").send(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
  logger.info({ url: appUrl }, "Open client");
  logger.info({ url: apiUrl }, "API base");
});

import { createApp } from "../artifacts/api-server/src/app";
import { VercelRequest, VercelResponse } from "@vercel/node";

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel passes the request to Express
  app(req, res);
}
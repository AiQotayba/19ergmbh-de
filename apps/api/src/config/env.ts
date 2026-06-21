import { config } from "dotenv";
import { resolve } from "node:path";

const apiRoot = process.cwd();
const monorepoRoot = resolve(apiRoot, "../..");

config({ path: resolve(monorepoRoot, ".env"), override: true });
config({ path: resolve(apiRoot, ".env"), override: true });

export const env = {
  port: Number(process.env.API_PORT) || 3002,
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV ?? "development",
};

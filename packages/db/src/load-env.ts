import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");

const preservePlatformEnv = Boolean(process.env.VERCEL || process.env.CI);

const envFiles = [
  resolve(repoRoot, ".env"),
  resolve(repoRoot, ".env.local"),
  resolve(packageRoot, ".env"),
];

for (const file of envFiles) {
  if (existsSync(file)) {
    config({ path: file, override: !preservePlatformEnv });
  }
}

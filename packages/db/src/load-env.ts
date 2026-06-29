import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { materializePrismaSchema } from "../scripts/materialize-schema.mjs";
import { resolveDatabaseProvider } from "./database-url";

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

const provider = resolveDatabaseProvider();
materializePrismaSchema(provider, packageRoot);

function readMaterializedProvider(): string | null {
  const schemaPath = resolve(packageRoot, ".prisma/schema");
  if (!existsSync(schemaPath)) return null;
  const match = readFileSync(schemaPath, "utf8").match(/provider\s*=\s*"(mysql|postgresql)"/);
  return match?.[1] ?? null;
}

const materialized = readMaterializedProvider();
if (materialized && materialized !== provider) {
  console.warn(
    `[db] Prisma client may be stale (generated for ${materialized}, env is ${provider}). Run: pnpm db:generate`,
  );
}

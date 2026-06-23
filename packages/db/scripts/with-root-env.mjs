import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { materializePrismaSchema } from "./materialize-schema.mjs";

const dbRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(dbRoot, "../..");

const preservePlatformEnv = Boolean(process.env.VERCEL || process.env.CI);

for (const name of [".env", ".env.local"]) {
  const envPath = resolve(repoRoot, name);
  if (existsSync(envPath)) {
    config({ path: envPath, override: !preservePlatformEnv });
  }
}

const args = process.argv.slice(2);
const isGenerateOnly = args.length === 1 && args[0] === "generate";

// Prisma generate only materializes the schema — no live DB connection.
// Vercel frontend projects may build @19er/db transitively without DATABASE_URL.
if (
  isGenerateOnly &&
  (process.env.VERCEL || process.env.CI) &&
  !process.env.DATABASE_URL?.trim()
) {
  process.env.DATABASE_URL = "postgresql://build:build@127.0.0.1:5432/build";
  process.env.DATABASE_PROVIDER = "postgresql";
}

let dbUrl = process.env.DATABASE_URL?.trim();
let dbProvider = process.env.DATABASE_PROVIDER?.trim().toLowerCase();
let validDb =
  dbUrl?.startsWith("mysql://") || dbUrl?.startsWith("postgresql://");
let validProvider = dbProvider === "mysql" || dbProvider === "postgresql";

if (!validDb) {
  const preview = dbUrl
    ? dbUrl.replace(/:[^:@]+@/, ":****@").slice(0, 60)
    : "(empty or unset)";
  console.error("DATABASE_URL must start with mysql:// or postgresql://");
  console.error(`Expected in: ${resolve(repoRoot, ".env")} or .env.local`);
  console.error(`Current value: ${preview}`);
  console.error(`\nExample: DATABASE_URL="postgresql://USER:PASS@127.0.0.1:5433/DATABASE"`);
  process.exit(1);
}

if (!validProvider) {
  console.error('DATABASE_PROVIDER must be "mysql" or "postgresql"');
  console.error(`Expected in: ${resolve(repoRoot, ".env")} or .env.local`);
  console.error(`Current value: ${dbProvider ?? "(empty or unset)"}`);
  process.exit(1);
}

if (dbProvider === "mysql" && !dbUrl.startsWith("mysql://")) {
  console.error("DATABASE_PROVIDER=mysql but DATABASE_URL is not mysql://");
  process.exit(1);
}

if (
  dbProvider === "postgresql" &&
  !dbUrl.startsWith("postgresql://") &&
  !dbUrl.startsWith("postgres://")
) {
  console.error("DATABASE_PROVIDER=postgresql but DATABASE_URL is not postgresql://");
  process.exit(1);
}

materializePrismaSchema(dbProvider, dbRoot);

if (args.length === 0) {
  console.error("Usage: node scripts/with-root-env.mjs <prisma-args...>");
  process.exit(1);
}

const schemaPath = resolve(dbRoot, ".prisma/schema");
const prismaArgs = [...args, "--schema", schemaPath];

const binDir = resolve(dbRoot, "node_modules/.bin");
const prismaBin = ["prisma.CMD", "prisma.cmd", "prisma"].find((name) =>
  existsSync(resolve(binDir, name)),
);

if (!prismaBin) {
  console.error("Prisma CLI not found. Run pnpm install from the repo root first.");
  process.exit(1);
}

const result = spawnSync(resolve(binDir, prismaBin), prismaArgs, {
  cwd: dbRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(result.status ?? 1);

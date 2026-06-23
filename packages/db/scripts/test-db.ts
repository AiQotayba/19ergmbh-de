import { config } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createPrismaClient } from "../src/create-prisma-client";
import { parseMysqlUrl, resolveDatabaseProvider } from "../src/database-url";

const dbRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(dbRoot, "../..");

for (const name of [".env", ".env.local"]) {
  const envPath = resolve(repoRoot, name);
  if (existsSync(envPath)) {
    config({ path: envPath, override: true });
  }
}

function mask(url: string) {
  return url.replace(/:[^:@]+@/, ":****@");
}

function readGeneratedSchemaProvider() {
  const path = resolve(dbRoot, ".prisma/schema");
  if (!existsSync(path)) return null;
  const match = readFileSync(path, "utf8").match(/provider\s*=\s*"(mysql|postgresql)"/);
  return match?.[1] ?? null;
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  const providerEnv = process.env.DATABASE_PROVIDER?.trim();

  console.info("── Database diagnostics ──\n");

  if (!url) {
    console.error("DATABASE_URL is not set in .env or .env.local (repo root)");
    process.exit(1);
  }

  const provider = resolveDatabaseProvider(url, providerEnv);
  const schemaProvider = readGeneratedSchemaProvider();

  console.info(`DATABASE_PROVIDER: ${providerEnv ?? "(unset — inferred from URL)"}`);
  console.info(`Resolved provider: ${provider}`);
  console.info(`Prisma schema:       ${schemaProvider ?? "(not generated — run pnpm db:generate)"}`);
  console.info(`DATABASE_URL:        ${mask(url)}`);

  if (schemaProvider && schemaProvider !== provider) {
    console.error(`
Mismatch: .env requests ${provider} but Prisma Client was generated for ${schemaProvider}

Fix:
  pnpm db:generate
  pnpm build
`);
    process.exit(1);
  }

  if (provider === "mysql") {
    const cfg = parseMysqlUrl(url);
    console.info(`MySQL host:          ${cfg.host}:${cfg.port}`);
    console.info(`MySQL database:      ${cfg.database}`);
    console.info(`MySQL user:          ${cfg.user}`);
  }

  console.info("\nConnecting via Prisma...\n");

  const prisma = createPrismaClient(url);

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.info("SELECT 1 — OK");

    if (provider === "mysql") {
      const tables = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*) AS cnt
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `;
      const count = Number(tables[0]?.cnt ?? 0);
      console.info(`Tables in database: ${count}`);

      if (count === 0) {
        console.info("\nDatabase is empty — run: pnpm db:push && pnpm db:seed");
      }
    } else {
      const users = await prisma.user.count();
      console.info(`User table — ${users} row(s)`);
    }

    console.info("\nConnection OK.");
    process.exit(0);
  } catch (error) {
    console.error("\nConnection failed:\n");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    console.error(`
Common fixes:
  • Provider mismatch — run pnpm db:generate after changing DATABASE_PROVIDER
  • Missing tables — run pnpm db:push
  • Wrong credentials — check DATABASE_URL in .env / .env.local
`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

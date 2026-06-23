export type DatabaseProvider = "mysql" | "postgresql";

export function resolveDatabaseProvider(
  connectionString = process.env.DATABASE_URL,
  providerEnv = process.env.DATABASE_PROVIDER,
): DatabaseProvider {
  const normalized = providerEnv?.trim().toLowerCase();
  if (normalized === "mysql") return "mysql";
  if (normalized === "postgresql" || normalized === "postgres") return "postgresql";

  if (connectionString?.startsWith("mysql://") || connectionString?.startsWith("mysql2://")) {
    return "mysql";
  }

  return "postgresql";
}

export function parseMysqlUrl(connectionString: string) {
  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL must include a MySQL database name");
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectTimeout: 5_000,
    connectionLimit: 10,
  };
}

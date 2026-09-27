import "server-only"
import { Pool, type QueryResultRow } from "pg"

// Reuse one pool across HMR reloads and warm serverless invocations.
const globalForPg = globalThis as unknown as { __kelpersPgPool?: Pool }

// pg lets SSL params in the connection string (e.g. sslmode=require) override the
// explicit `ssl` object, which would re-enable strict cert verification.
function stripSslParams(connectionString: string): string {
  const url = new URL(connectionString)
  for (const key of ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) {
    url.searchParams.delete(key)
  }
  return url.toString()
}

function getPool(): Pool {
  if (globalForPg.__kelpersPgPool) return globalForPg.__kelpersPgPool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set.")
  const pool = new Pool({
    connectionString: stripSslParams(connectionString),
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  })
  pool.on("error", (err) => console.error("[db] idle client error:", err.message))
  globalForPg.__kelpersPgPool = pool
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params)
}

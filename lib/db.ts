import "server-only"
import { Pool, type QueryResultRow } from "pg"

// Reuse one pool across HMR reloads and warm serverless invocations.
const globalForPg = globalThis as unknown as { __kelpersPgPool?: Pool }

function getPool(): Pool {
  if (globalForPg.__kelpersPgPool) return globalForPg.__kelpersPgPool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set.")
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 })
  pool.on("error", (err) => console.error("[db] idle client error:", err.message))
  globalForPg.__kelpersPgPool = pool
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params)
}

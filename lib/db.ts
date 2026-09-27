import "server-only"
import { Pool } from "pg"

// A single pooled connection to the Tiger Data (PostgreSQL) database.
// This module is server-only; the connection string is never exposed to the client.
declare global {
  // eslint-disable-next-line no-var
  var __kelpersPool: Pool | undefined
}

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it as a server-side environment variable.")
  }
  return new Pool({
    connectionString,
    // Tiger Data / managed Postgres requires TLS.
    ssl: { rejectUnauthorized: false },
    max: 5,
  })
}

// Reuse the pool across hot reloads / serverless invocations in the same runtime.
export const pool: Pool = globalThis.__kelpersPool ?? createPool()
if (process.env.NODE_ENV !== "production") {
  globalThis.__kelpersPool = pool
}

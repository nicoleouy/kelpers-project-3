import { Pool } from "pg"

// Strip any sslmode from the URL so our explicit ssl config (which allows the
// managed provider's self-signed cert chain) is honored.
function connectionString() {
  const url = new URL(process.env.DATABASE_URL)
  url.searchParams.delete("sslmode")
  return url.toString()
}

const pool = new Pool({
  connectionString: connectionString(),
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS postgis`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS environmental_reports (
      id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id              TEXT,
      user_name            TEXT,
      title                TEXT,
      description          TEXT NOT NULL,
      category             TEXT NOT NULL,
      severity             TEXT NOT NULL,
      status               TEXT DEFAULT 'open',
      tags                 TEXT[] NOT NULL DEFAULT '{}',
      image_url            TEXT,
      location             geometry(Point, 4326) NOT NULL,
      approximate_location TEXT,
      confirmation_count   INTEGER NOT NULL DEFAULT 0,
      incident_id          TEXT,
      is_crisis            BOOLEAN NOT NULL DEFAULT false,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`CREATE INDEX IF NOT EXISTS environmental_reports_location_idx ON environmental_reports USING GIST (location)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS environmental_reports_created_at_idx ON environmental_reports (created_at DESC)`)

  console.log("[v0] environmental_reports table ready")
  await pool.end()
}

main().catch((err) => {
  console.error("[v0] init-db failed:", err)
  process.exit(1)
})

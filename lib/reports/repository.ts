import "server-only"
import { query } from "@/lib/db"
import { CATEGORIES, SEVERITY_ORDER } from "@/lib/categories"
import { CURRENT_USER } from "@/lib/mock-data"
import type { CategoryId, Report, Severity } from "@/lib/types"
import type { NewReportInput } from "./validate"

export const TABLE = "environmental_reports"
const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id))

type ColumnInfo = Map<string, string>

// The table was created outside this repo, so discover which optional columns exist
// instead of assuming them — an unknown column would fail every insert.
let columnsPromise: Promise<ColumnInfo> | null = null

export function getColumns(): Promise<ColumnInfo> {
  columnsPromise ??= query<{ column_name: string; udt_name: string }>(
    `SELECT column_name, udt_name
       FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = ANY (current_schemas(false))`,
    [TABLE],
  )
    .then((res) => {
      if (res.rows.length === 0) throw new Error(`Table ${TABLE} was not found.`)
      return new Map(res.rows.map((r) => [r.column_name, r.udt_name]))
    })
    .catch((err) => {
      columnsPromise = null
      throw err
    })
  return columnsPromise
}

function encodeTags(tags: string[], udt: string): unknown {
  if (udt.startsWith("_")) return tags
  if (udt === "json" || udt === "jsonb") return JSON.stringify(tags)
  return tags.join(", ")
}

function decodeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((t): t is string => typeof t === "string")
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === "string")
    } catch {}
    return value.split(",").map((t) => t.trim()).filter(Boolean)
  }
  return []
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function toReport(row: Record<string, unknown>): Report {
  const latitude = Number(row.latitude)
  const longitude = Number(row.longitude)
  const created = row.created_at instanceof Date ? row.created_at : new Date(String(row.created_at ?? Date.now()))
  const category = String(row.category ?? "")
  const severity = String(row.severity ?? "")
  return {
    id: String(row.id),
    userId: str(row.user_id) ?? "community",
    userName: str(row.user_name) ?? "Community member",
    category: (CATEGORY_IDS.has(category) ? category : "litter") as CategoryId,
    tags: decodeTags(row.tags),
    description: String(row.description ?? ""),
    image: str(row.image_url) ?? str(row.image),
    latitude,
    longitude,
    approximateLocation:
      str(row.approximate_location) ?? `Near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
    severity: (SEVERITY_ORDER as string[]).includes(severity) ? (severity as Severity) : "moderate",
    createdAt: Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString(),
    confirmationCount: Number(row.confirmation_count ?? 0) || 0,
    isCrisis: typeof row.is_crisis === "boolean" ? row.is_crisis : undefined,
  }
}

const COORDS = "ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude"

export async function listReports(limit = 200): Promise<Report[]> {
  const columns = await getColumns()
  const orderBy = columns.has("created_at") ? "created_at DESC" : "id DESC"
  const res = await query(
    `SELECT *, ${COORDS} FROM ${TABLE} WHERE location IS NOT NULL ORDER BY ${orderBy} LIMIT $1`,
    [limit],
  )
  return res.rows.map(toReport)
}

export async function insertReport(input: NewReportInput): Promise<Report> {
  const columns = await getColumns()
  const names: string[] = ["category", "description", "severity"]
  const params: unknown[] = [input.category, input.description, input.severity]

  const optional: [column: string, value: unknown][] = [
    ["user_id", CURRENT_USER.id],
    ["user_name", CURRENT_USER.name],
    ["approximate_location", input.approximateLocation],
    ["is_crisis", input.isCrisis],
    [columns.has("image_url") ? "image_url" : "image", input.image],
  ]
  for (const [column, value] of optional) {
    if (value !== undefined && columns.has(column)) {
      names.push(column)
      params.push(value)
    }
  }
  const tagsUdt = columns.get("tags")
  if (tagsUdt && input.tags.length > 0) {
    names.push("tags")
    params.push(encodeTags(input.tags, tagsUdt))
  }

  const placeholders = params.map((_, i) => `$${i + 1}`)
  params.push(input.longitude, input.latitude)
  names.push("location")
  placeholders.push(`ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)`)

  const res = await query(
    `INSERT INTO ${TABLE} (${names.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *, ${COORDS}`,
    params,
  )
  return toReport(res.rows[0])
}

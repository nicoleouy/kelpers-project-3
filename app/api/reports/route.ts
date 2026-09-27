import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import type { Report } from "@/lib/types"

export const dynamic = "force-dynamic"

// Columns selected for both GET and the INSERT ... RETURNING in POST.
// Coordinates are extracted from the PostGIS geometry: ST_X = longitude, ST_Y = latitude.
const SELECT_COLUMNS = `
  id,
  user_id,
  user_name,
  title,
  description,
  category,
  severity,
  status,
  tags,
  image_url,
  ST_Y(location) AS latitude,
  ST_X(location) AS longitude,
  approximate_location,
  confirmation_count,
  incident_id,
  is_crisis,
  created_at
`

type ReportRow = {
  id: string
  user_id: string | null
  user_name: string | null
  title: string | null
  description: string | null
  category: string | null
  severity: string | null
  status: string | null
  tags: string[] | null
  image_url: string | null
  latitude: number | null
  longitude: number | null
  approximate_location: string | null
  confirmation_count: number | null
  incident_id: string | null
  is_crisis: boolean | null
  created_at: Date | string | null
}

// Convert a snake_case database row into the camelCase shape used by the Kelpers UI.
function toReport(row: ReportRow): Report {
  return {
    id: String(row.id),
    userId: row.user_id ?? "",
    userName: row.user_name ?? "",
    category: (row.category ?? "litter") as Report["category"],
    tags: row.tags ?? [],
    description: row.description ?? "",
    image: row.image_url ?? undefined,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    approximateLocation: row.approximate_location ?? "",
    severity: (row.severity ?? "moderate") as Report["severity"],
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : (row.created_at ?? new Date().toISOString()),
    confirmationCount: row.confirmation_count ?? 0,
    incidentId: row.incident_id ?? undefined,
    isCrisis: row.is_crisis ?? undefined,
  }
}

export async function GET() {
  try {
    const { rows } = await pool.query<ReportRow>(
      `SELECT ${SELECT_COLUMNS} FROM environmental_reports ORDER BY created_at DESC`,
    )
    return NextResponse.json(rows.map(toReport))
  } catch (error) {
    console.log("[v0] GET /api/reports failed:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to load reports." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const category = typeof body.category === "string" ? body.category.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const severity = typeof body.severity === "string" ? body.severity.trim() : ""
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)

  const missing: string[] = []
  if (!category) missing.push("category")
  if (!description) missing.push("description")
  if (!severity) missing.push("severity")
  if (!Number.isFinite(latitude)) missing.push("latitude")
  if (!Number.isFinite(longitude)) missing.push("longitude")

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing or invalid required field(s): ${missing.join(", ")}.` },
      { status: 400 },
    )
  }

  // Optional fields.
  const userId = typeof body.userId === "string" ? body.userId : null
  const userName = typeof body.userName === "string" ? body.userName : null
  const title = typeof body.title === "string" ? body.title : null
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : []
  const image = typeof body.image === "string" ? body.image : null
  const approximateLocation =
    typeof body.approximateLocation === "string" ? body.approximateLocation : null
  const confirmationCount = Number.isFinite(Number(body.confirmationCount))
    ? Number(body.confirmationCount)
    : 0
  const incidentId = typeof body.incidentId === "string" ? body.incidentId : null
  const isCrisis = typeof body.isCrisis === "boolean" ? body.isCrisis : false

  try {
    const { rows } = await pool.query<ReportRow>(
      `
      INSERT INTO environmental_reports
        (user_id, user_name, title, description, category, severity, tags, image_url,
         location, approximate_location, confirmation_count, incident_id, is_crisis)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8,
         ST_SetSRID(ST_MakePoint($9, $10), 4326), $11, $12, $13, $14)
      RETURNING ${SELECT_COLUMNS}
      `,
      [
        userId,
        userName,
        title,
        description,
        category,
        severity,
        tags,
        image,
        // PostGIS point order: longitude first, latitude second.
        longitude,
        latitude,
        approximateLocation,
        confirmationCount,
        incidentId,
        isCrisis,
      ],
    )
    return NextResponse.json(toReport(rows[0]), { status: 201 })
  } catch (error) {
    console.log("[v0] POST /api/reports failed:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to save report." }, { status: 500 })
  }
}

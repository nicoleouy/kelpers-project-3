import "server-only"
import { query } from "@/lib/db"
import { TABLE, getColumns } from "@/lib/reports/repository"
import type { HeatCell, HeatmapCategory, HeatmapData } from "./types"

// ~0.001° ≈ 110 m. Aggregating in Postgres keeps the payload bounded as the table grows.
const GRID_DEGREES = 0.001
const MAX_CELLS = 20_000

export async function getHeatmap(category: HeatmapCategory): Promise<HeatmapData> {
  const columns = await getColumns()

  // Without an is_crisis column every report is a community report and there are no crises.
  let crisisFilter: string
  if (columns.has("is_crisis")) {
    crisisFilter = category === "crisis" ? "is_crisis IS TRUE" : "is_crisis IS NOT TRUE"
  } else {
    crisisFilter = category === "crisis" ? "FALSE" : "TRUE"
  }

  const res = await query<{ lat: number; lng: number; n: number }>(
    `SELECT ST_Y(cell) AS lat, ST_X(cell) AS lng, n
       FROM (
         SELECT ST_SnapToGrid(location::geometry, $1) AS cell, COUNT(*)::int AS n
           FROM ${TABLE}
          WHERE location IS NOT NULL
            AND NOT ST_IsEmpty(location::geometry)
            AND ${crisisFilter}
          GROUP BY 1
       ) grid
      WHERE ST_Y(cell) BETWEEN -90 AND 90
        AND ST_X(cell) BETWEEN -180 AND 180
      ORDER BY n DESC
      LIMIT $2`,
    [GRID_DEGREES, MAX_CELLS],
  )

  const cells: HeatCell[] = []
  let total = 0
  let maxCount = 0
  for (const row of res.rows) {
    const lat = Number(row.lat)
    const lng = Number(row.lng)
    const n = Number(row.n)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !(n > 0)) continue
    cells.push([Number(lat.toFixed(5)), Number(lng.toFixed(5)), n])
    total += n
    if (n > maxCount) maxCount = n
  }

  return { category, cells, total, maxCount, generatedAt: new Date().toISOString() }
}

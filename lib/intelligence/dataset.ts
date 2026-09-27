import "server-only"
import { query } from "@/lib/db"
import { listReports } from "@/lib/reports/repository"
import { INTERVENTION_CATEGORIES } from "./aggregate"
import type { Intervention, Observation } from "./types"

const MAX_OBSERVATIONS = 5000

async function listVolunteerEvents(): Promise<Intervention[]> {
  try {
    const res = await query<{
      id: string
      title: string | null
      event_time: Date | string | null
      latitude: number | null
      longitude: number | null
      current_volunteers: number | null
    }>(
      `SELECT id, title, event_time, current_volunteers,
              ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude
         FROM volunteer_events
        WHERE location IS NOT NULL AND event_time IS NOT NULL
        LIMIT 1000`,
    )
    return res.rows
      .filter((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
      .map((r) => ({
        id: String(r.id),
        title: r.title ?? "Volunteer event",
        source: "volunteer_event" as const,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        occurredAt: new Date(r.event_time as string),
        volunteers: r.current_volunteers ?? undefined,
      }))
  } catch (err) {
    // The events table is optional to this analysis; without it we simply skip intervention effects.
    console.warn("[intelligence] volunteer_events unavailable:", (err as Error).message)
    return []
  }
}

export async function loadDataset(): Promise<{ observations: Observation[]; interventions: Intervention[] }> {
  const [reports, events] = await Promise.all([listReports(MAX_OBSERVATIONS), listVolunteerEvents()])

  const observations: Observation[] = reports
    .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
    .map((r) => ({
      id: r.id,
      category: r.category,
      severity: r.severity,
      latitude: r.latitude,
      longitude: r.longitude,
      createdAt: new Date(r.createdAt),
      approximateLocation: r.approximateLocation,
      description: r.description,
      incidentId: r.incidentId,
      isCrisis: r.isCrisis,
      confirmationCount: r.confirmationCount,
    }))

  const cleanupReports: Intervention[] = observations
    .filter((o) => INTERVENTION_CATEGORIES.has(o.category))
    .map((o) => ({
      id: `report-${o.id}`,
      title: `Community ${o.category.replace("-", " ")}`,
      source: "cleanup_report",
      latitude: o.latitude,
      longitude: o.longitude,
      occurredAt: o.createdAt,
    }))

  return { observations, interventions: [...events, ...cleanupReports] }
}

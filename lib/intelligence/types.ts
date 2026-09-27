import type { CategoryId, Severity } from "@/lib/types"
import type { GrokAnalysis } from "./schema"

export interface Observation {
  id: string
  category: CategoryId
  severity: Severity
  latitude: number
  longitude: number
  createdAt: Date
  approximateLocation?: string
  description: string
  incidentId?: string
  isCrisis?: boolean
  status?: string
  confirmationCount: number
}

export interface Intervention {
  id: string
  title: string
  source: "volunteer_event" | "cleanup_report"
  latitude: number
  longitude: number
  occurredAt: Date
  volunteers?: number
}

export interface DataProfile {
  observationCount: number
  interventionCount: number
  earliest: string | null
  latest: string | null
  spanDays: number
  distinctMonths: number
  categoriesPresent: number
  groupedIntoIncidents: number
  crisisFlagged: number
  statusBreakdown: Record<string, number>
  capabilities: {
    geographic: boolean
    temporalTrends: boolean
    seasonality: boolean
    categoryRelationships: boolean
    interventions: boolean
  }
  gaps: string[]
}

export type IntelligenceResponse =
  | {
      status: "ok"
      generatedAt: string
      model: string
      profile: DataProfile
      analysis: GrokAnalysis
    }
  | {
      status: "insufficient-data"
      generatedAt: string
      profile: DataProfile
      minimumObservations: number
    }
  | { status: "error"; error: string; profile?: DataProfile }

/** Same as IntelligenceResponse, plus "idle" when enough data exists but no analysis has been run yet. */
export type ConclusionsResponse = IntelligenceResponse | { status: "idle"; profile: DataProfile }

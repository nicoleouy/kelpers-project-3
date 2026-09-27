export type Severity = "low" | "moderate" | "high" | "severe"

export type CategoryId =
  | "litter"
  | "recycling"
  | "water-pollution"
  | "air-pollution"
  | "smoke-fire"
  | "chemical"
  | "wildlife"
  | "injured-wildlife"
  | "damaged-tree"
  | "invasive-species"
  | "habitat-damage"
  | "plant-observation"
  | "flooding"
  | "storm-damage"
  | "drought"
  | "extreme-weather"
  | "natural-disaster"
  | "unsafe-infrastructure"
  | "water-leak"
  | "light-pollution"
  | "park-condition"
  | "beach-coastal"
  | "beach-cleanup"
  | "park-cleanup"
  | "restoration"

export type CauseTag =
  | "Litter"
  | "Water"
  | "Wildlife"
  | "Trees"
  | "Conservation"
  | "Recycling"
  | "Climate"
  | "Community"
  | "Education"

export interface Report {
  id: string
  userId: string
  userName: string
  category: CategoryId
  tags: string[]
  description: string
  image?: string
  latitude: number
  longitude: number
  approximateLocation: string
  severity: Severity
  createdAt: string
  confirmationCount: number
  confirmedByMe?: boolean
  incidentId?: string
  isCrisis?: boolean
  /**
   * Optional Gemini quality-control result. Not yet persisted — the TigerData
   * layer will populate this once it stores verification results. When absent,
   * the UI treats the report as "AI verification pending".
   */
  verification?: import("./gemini/types").VerificationResult
}

export interface Incident {
  id: string
  title: string
  category: CategoryId
  description: string
  latitude: number
  longitude: number
  reportIds: string[]
  reportCount: number
  firstReportedAt: string
  lastReportedAt: string
  severity: Severity
  aiGrouped: boolean
  groupingConfidenceLabel: string
  approximateLocation: string
  status?: "monitoring" | "responding" | "resolved"
}

export interface VolunteerOpportunity {
  id: string
  organizationId: string
  organizationName: string
  title: string
  description: string
  location: string
  latitude: number
  longitude: number
  date: string
  time: string
  duration: string
  distanceMiles: number
  categories: CauseTag[]
  tags: string[]
  capacity: number
  registeredCount: number
  setting: "Indoor" | "Outdoor"
  skillLevel: "Beginner" | "Intermediate" | "Any"
  relatedReportId?: string
  registeredByMe?: boolean
  savedByMe?: boolean
}

export interface Organization {
  id: string
  name: string
  description: string
  categories: CauseTag[]
  logoColor: string
}

export interface ResearchRequest {
  id: string
  researcherName: string
  region: string
  dateRange: string
  categories: string[]
  purpose: string
  status: "submitted" | "under-review" | "approved"
  estimatedObservationCount: number
  createdAt: string
}

export interface ProfileActivity {
  id: string
  type: "report" | "volunteer" | "action"
  label: string
  location: string
  date: string
}

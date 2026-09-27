import type { CategoryId, CauseTag, VolunteerOpportunity } from "./types"
import { haversineMiles } from "./geo"

// Maps an environmental report category to the volunteer cause tags most likely
// to offer a relevant way to help.
const CATEGORY_CAUSES: Record<CategoryId, CauseTag[]> = {
  litter: ["Litter", "Community"],
  recycling: ["Recycling", "Community"],
  "water-pollution": ["Water"],
  "air-pollution": ["Climate"],
  "smoke-fire": ["Climate"],
  chemical: ["Water", "Conservation"],
  wildlife: ["Wildlife"],
  "injured-wildlife": ["Wildlife"],
  "damaged-tree": ["Trees"],
  "invasive-species": ["Conservation", "Trees"],
  "habitat-damage": ["Conservation", "Wildlife"],
  "plant-observation": ["Conservation"],
  flooding: ["Water", "Climate"],
  "storm-damage": ["Trees", "Community"],
  drought: ["Climate", "Water"],
  "extreme-weather": ["Climate"],
  "natural-disaster": ["Community"],
  "unsafe-infrastructure": ["Community"],
  "water-leak": ["Water"],
  "light-pollution": ["Community"],
  "park-condition": ["Litter", "Community"],
  "beach-coastal": ["Water", "Litter", "Wildlife"],
  "beach-cleanup": ["Litter", "Water"],
  "park-cleanup": ["Litter", "Community"],
  restoration: ["Conservation"],
}

export function matchOpportunity(
  target: { id?: string; category: CategoryId; latitude: number; longitude: number },
  opportunities: VolunteerOpportunity[],
): VolunteerOpportunity | null {
  if (opportunities.length === 0) return null

  // 1. An opportunity explicitly linked to this report.
  if (target.id) {
    const direct = opportunities.find((o) => o.relatedReportId === target.id)
    if (direct) return direct
  }

  // 2. Cause-category match, preferring the nearest opportunity.
  const causes = CATEGORY_CAUSES[target.category] ?? []
  if (causes.length === 0) return null

  const matches = opportunities
    .filter((o) => o.categories.some((c) => causes.includes(c)))
    .sort((a, b) => {
      const score = (o: VolunteerOpportunity) => o.categories.filter((c) => causes.includes(c)).length
      const byCause = score(b) - score(a)
      if (byCause !== 0) return byCause
      return haversineMiles(target, a) - haversineMiles(target, b)
    })

  return matches[0] ?? null
}

export type HeatmapCategory = "community" | "crisis"

export const HEATMAP_CATEGORIES: { id: HeatmapCategory; label: string }[] = [
  { id: "community", label: "Community Reports" },
  { id: "crisis", label: "Crises" },
]

/** [latitude, longitude, reportCount] for one ~110 m grid cell. */
export type HeatCell = [number, number, number]

export interface HeatmapData {
  category: HeatmapCategory
  cells: HeatCell[]
  total: number
  maxCount: number
  generatedAt: string
}

export function isHeatmapCategory(value: unknown): value is HeatmapCategory {
  return value === "community" || value === "crisis"
}

"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import type { FocusTarget } from "./eco-map"
import type { Incident, Report, VolunteerOpportunity } from "@/lib/types"
import type { HeatCell, HeatmapCategory } from "@/lib/heatmap/types"

const EcoMap = dynamic(() => import("./eco-map"), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center bg-accent/40">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  ),
})

export function MapView(props: {
  heat?: { cells: HeatCell[]; maxCount: number; category: HeatmapCategory }
  reports: Report[]
  incidents: Incident[]
  opportunities?: VolunteerOpportunity[]
  onSelect?: (kind: "report" | "incident" | "opportunity", id: string) => void
  center?: [number, number]
  zoom?: number
  focus?: FocusTarget | null
  highlightId?: string | null
}) {
  return <EcoMap {...props} />
}

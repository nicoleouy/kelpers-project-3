"use client"

import "./leaflet-global"
import "leaflet.heat"
import { useEffect, useRef } from "react"
import L from "leaflet"
import { useMap } from "react-leaflet"
import type { HeatCell, HeatmapCategory } from "@/lib/heatmap/types"

type HeatLayerOptions = {
  radius?: number
  blur?: number
  max?: number
  maxZoom?: number
  minOpacity?: number
  gradient?: Record<number, string>
}
type HeatLayer = L.Layer & {
  setLatLngs: (points: HeatCell[]) => HeatLayer
  setOptions: (options: HeatLayerOptions) => HeatLayer
}
const heatLayer = (L as unknown as { heatLayer: (points: HeatCell[], o: HeatLayerOptions) => HeatLayer }).heatLayer

// Light → dark as report density rises.
export const HEAT_GRADIENTS: Record<HeatmapCategory, Record<number, string>> = {
  community: { 0.2: "#d9f99d", 0.45: "#65a30d", 0.7: "#3f6212", 1: "#1a2e05" },
  crisis: { 0.2: "#fecaca", 0.45: "#ef4444", 0.7: "#b91c1c", 1: "#450a0a" },
}

export function HeatLayer({
  cells,
  maxCount,
  category,
}: {
  cells: HeatCell[]
  maxCount: number
  category: HeatmapCategory
}) {
  const map = useMap()
  const layerRef = useRef<HeatLayer | null>(null)

  useEffect(() => {
    const layer = heatLayer([], { radius: 28, blur: 22, minOpacity: 0.35, maxZoom: 14 })
    layer.addTo(map)
    layerRef.current = layer
    return () => {
      layer.remove()
      layerRef.current = null
    }
  }, [map])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.setOptions({ max: Math.max(1, maxCount), gradient: HEAT_GRADIENTS[category] })
    layer.setLatLngs(cells)
  }, [cells, maxCount, category])

  return null
}

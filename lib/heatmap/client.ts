"use client"

import useSWR, { mutate } from "swr"
import type { HeatmapCategory, HeatmapData } from "./types"

export const HEATMAP_REFRESH_MS = 30_000

const heatmapKey = (category: HeatmapCategory) => `/api/heatmap?category=${category}`

async function fetchHeatmap(url: string): Promise<HeatmapData> {
  const res = await fetch(url, { cache: "no-store" })
  const body = (await res.json().catch(() => null)) as ({ ok: boolean; error?: string } & HeatmapData) | null
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Couldn't load map data right now.")
  return body
}

export function useHeatmap(category: HeatmapCategory) {
  return useSWR(heatmapKey(category), fetchHeatmap, {
    refreshInterval: HEATMAP_REFRESH_MS,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })
}

/** Call after a report is saved so every mounted heatmap picks it up immediately. */
export function revalidateHeatmaps() {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/heatmap"))
}

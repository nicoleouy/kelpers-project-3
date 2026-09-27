import "server-only"
import { buildAggregates, buildProfile } from "./aggregate"
import { loadDataset } from "./dataset"
import { analyzeWithGrok, GROK_MODEL } from "./grok"
import type { IntelligenceResponse } from "./types"

export const MIN_OBSERVATIONS = 8
const CACHE_TTL_MS = 15 * 60_000

// Aggregate analysis is expensive and only changes when the dataset does, so cache by dataset fingerprint.
const globalCache = globalThis as unknown as {
  __kelpersIntel?: { key: string; at: number; value: Promise<IntelligenceResponse> }
}

export async function getIntelligence({ refresh = false } = {}): Promise<IntelligenceResponse> {
  const { observations, interventions } = await loadDataset()
  const profile = buildProfile(observations, interventions)
  const key = `${profile.observationCount}:${profile.latest}:${profile.interventionCount}`

  if (profile.observationCount < MIN_OBSERVATIONS) {
    return {
      status: "insufficient-data",
      generatedAt: new Date().toISOString(),
      profile,
      minimumObservations: MIN_OBSERVATIONS,
    }
  }

  const cached = globalCache.__kelpersIntel
  if (cached && cached.key === key && (!refresh || Date.now() - cached.at < 60_000) && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value
  }

  const value = (async (): Promise<IntelligenceResponse> => {
    const analysis = await analyzeWithGrok(profile, buildAggregates(observations, interventions))
    return { status: "ok", generatedAt: new Date().toISOString(), model: GROK_MODEL, profile, analysis }
  })()
  globalCache.__kelpersIntel = { key, at: Date.now(), value }
  value.catch(() => {
    if (globalCache.__kelpersIntel?.value === value) globalCache.__kelpersIntel = undefined
  })
  return value
}

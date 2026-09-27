import { CATEGORY_MAP, SEVERITY_ORDER } from "@/lib/categories"
import type { CategoryId } from "@/lib/types"
import type { DataProfile, Intervention, Observation } from "./types"

// ~1.1 km cells: small enough to separate neighborhoods, large enough to pool sparse reports.
const CELL_DEG = 0.01
const DAY_MS = 86_400_000
const INTERVENTION_RADIUS_KM = 1.5
const INTERVENTION_WINDOW_DAYS = 60

export const INTERVENTION_CATEGORIES = new Set<CategoryId>(["beach-cleanup", "park-cleanup", "restoration"])

const label = (id: CategoryId) => CATEGORY_MAP[id]?.label ?? id
const monthKey = (d: Date) => d.toISOString().slice(0, 7)
const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p

function cellOf(lat: number, lng: number) {
  const r = Math.floor(lat / CELL_DEG)
  const c = Math.floor(lng / CELL_DEG)
  return { r, c, id: `${r}:${c}` }
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

function countBy<T>(items: T[], key: (t: T) => string) {
  const out: Record<string, number> = {}
  for (const item of items) {
    const k = key(item)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function topEntries(record: Record<string, number>, n: number) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

export function buildProfile(observations: Observation[], interventions: Intervention[]): DataProfile {
  const times = observations.map((o) => o.createdAt.getTime()).sort((a, b) => a - b)
  const earliest = times[0]
  const latest = times[times.length - 1]
  const spanDays = times.length ? Math.round((latest - earliest) / DAY_MS) : 0
  const distinctMonths = new Set(observations.map((o) => monthKey(o.createdAt))).size
  const categoriesPresent = new Set(observations.map((o) => o.category)).size
  const cells = new Set(observations.map((o) => cellOf(o.latitude, o.longitude).id)).size

  const capabilities = {
    geographic: observations.length >= 8 && cells >= 2,
    temporalTrends: spanDays >= 28 && distinctMonths >= 1,
    seasonality: spanDays >= 365,
    categoryRelationships: categoriesPresent >= 2 && cells >= 2,
    interventions: interventions.length > 0 && spanDays >= 14,
  }

  const gaps: string[] = []
  if (!capabilities.seasonality)
    gaps.push(`Only ${spanDays} days of history — seasonal patterns need at least 12 months.`)
  if (!capabilities.temporalTrends) gaps.push("Too little history to measure trends over weeks or months.")
  if (!capabilities.interventions)
    gaps.push("No intervention records (volunteer events or cleanup reports) overlap the observation history.")
  if (observations.filter((o) => o.incidentId).length === 0)
    gaps.push("Reports have not been grouped into incidents, so counts may include duplicates of the same problem.")
  gaps.push("No population or reporter-density data, so low report counts cannot distinguish 'no problem' from 'no reporters'.")

  return {
    observationCount: observations.length,
    interventionCount: interventions.length,
    earliest: times.length ? new Date(earliest).toISOString() : null,
    latest: times.length ? new Date(latest).toISOString() : null,
    spanDays,
    distinctMonths,
    categoriesPresent,
    groupedIntoIncidents: observations.filter((o) => o.incidentId).length,
    crisisFlagged: observations.filter((o) => o.isCrisis).length,
    statusBreakdown: countBy(observations, (o) => o.status ?? "unspecified"),
    capabilities,
    gaps,
  }
}

interface CellStats {
  id: string
  r: number
  c: number
  lat: number
  lng: number
  area: string
  count: number
  categories: Record<string, number>
  severeOrHigh: number
  activeMonths: Set<string>
  first: number
  last: number
  samples: string[]
}

function buildCells(observations: Observation[]) {
  const cells = new Map<string, CellStats & { areaVotes: Record<string, number> }>()
  for (const o of observations) {
    const { r, c, id } = cellOf(o.latitude, o.longitude)
    let cell = cells.get(id)
    if (!cell) {
      cell = {
        id,
        r,
        c,
        lat: round((r + 0.5) * CELL_DEG, 3),
        lng: round((c + 0.5) * CELL_DEG, 3),
        area: "",
        count: 0,
        categories: {},
        severeOrHigh: 0,
        activeMonths: new Set(),
        first: Infinity,
        last: -Infinity,
        samples: [],
        areaVotes: {},
      }
      cells.set(id, cell)
    }
    const t = o.createdAt.getTime()
    cell.count++
    cell.categories[label(o.category)] = (cell.categories[label(o.category)] ?? 0) + 1
    if (SEVERITY_ORDER.indexOf(o.severity) >= 2) cell.severeOrHigh++
    cell.activeMonths.add(monthKey(o.createdAt))
    cell.first = Math.min(cell.first, t)
    cell.last = Math.max(cell.last, t)
    if (o.approximateLocation) cell.areaVotes[o.approximateLocation] = (cell.areaVotes[o.approximateLocation] ?? 0) + 1
    if (cell.samples.length < 3 && o.description.trim()) cell.samples.push(o.description.trim().slice(0, 160))
  }
  for (const cell of cells.values()) {
    cell.area = topEntries(cell.areaVotes, 1)[0]?.[0] ?? `Near ${cell.lat}, ${cell.lng}`
  }
  return cells
}

function geographic(cells: Map<string, CellStats>, total: number) {
  const list = [...cells.values()]
  const mean = total / Math.max(1, list.length)

  const hotspots = list
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map((cell) => {
      let neighborReports = 0
      let emptyNeighbors = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          const n = cells.get(`${cell.r + dr}:${cell.c + dc}`)
          if (n) neighborReports += n.count
          else emptyNeighbors++
        }
      return {
        cellId: cell.id,
        area: cell.area,
        center: [cell.lat, cell.lng],
        reports: cell.count,
        densityVsAverageCell: round(cell.count / mean, 1),
        highOrSevere: cell.severeOrHigh,
        topCategories: topEntries(cell.categories, 4),
        activeMonths: cell.activeMonths.size,
        firstSeen: new Date(cell.first).toISOString().slice(0, 10),
        lastSeen: new Date(cell.last).toISOString().slice(0, 10),
        neighborReports,
        emptyNeighborCells: emptyNeighbors,
        sampleDescriptions: cell.samples,
      }
    })

  const persistent = list
    .filter((c) => c.activeMonths.size >= 3)
    .sort((a, b) => b.activeMonths.size - a.activeMonths.size)
    .slice(0, 10)
    .map((c) => ({ cellId: c.id, area: c.area, activeMonths: c.activeMonths.size, reports: c.count }))

  return { cellSizeKm: 1.1, occupiedCells: list.length, meanReportsPerCell: round(mean, 1), hotspots, persistent }
}

function temporal(observations: Observation[], now: number) {
  const byMonth = countBy(observations, (o) => monthKey(o.createdAt))
  const monthly = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))

  const byCategoryMonth: Record<string, Record<string, number>> = {}
  for (const o of observations) {
    const cat = label(o.category)
    byCategoryMonth[cat] ??= {}
    const m = monthKey(o.createdAt)
    byCategoryMonth[cat][m] = (byCategoryMonth[cat][m] ?? 0) + 1
  }

  const last30 = (o: Observation) => now - o.createdAt.getTime() <= 30 * DAY_MS
  const prev30 = (o: Observation) => {
    const age = now - o.createdAt.getTime()
    return age > 30 * DAY_MS && age <= 60 * DAY_MS
  }
  const momentum = Object.entries(countBy(observations, (o) => label(o.category)))
    .map(([cat]) => {
      const inCat = observations.filter((o) => label(o.category) === cat)
      const recent = inCat.filter(last30).length
      const prior = inCat.filter(prev30).length
      return { category: cat, last30Days: recent, previous30Days: prior, change: recent - prior }
    })
    .filter((m) => m.last30Days + m.previous30Days > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 12)

  const monthOfYear: Record<string, number[]> = {}
  for (const o of observations) {
    const cat = label(o.category)
    monthOfYear[cat] ??= Array(12).fill(0)
    monthOfYear[cat][o.createdAt.getUTCMonth()]++
  }

  return {
    monthlyTotals: monthly,
    monthlyByCategory: byCategoryMonth,
    momentumLast30VsPrevious30: momentum,
    monthOfYearByCategory: monthOfYear,
  }
}

function coOccurrence(cells: Map<string, CellStats>) {
  const list = [...cells.values()]
  const n = list.length
  if (n < 2) return []
  const catCells: Record<string, number> = {}
  const pairCells: Record<string, number> = {}
  for (const cell of list) {
    const cats = Object.keys(cell.categories).sort()
    for (const c of cats) catCells[c] = (catCells[c] ?? 0) + 1
    for (let i = 0; i < cats.length; i++)
      for (let j = i + 1; j < cats.length; j++) {
        const key = `${cats[i]} + ${cats[j]}`
        pairCells[key] = (pairCells[key] ?? 0) + 1
      }
  }
  return Object.entries(pairCells)
    .filter(([, count]) => count >= 2)
    .map(([pair, count]) => {
      const [a, b] = pair.split(" + ")
      const lift = count / n / ((catCells[a] / n) * (catCells[b] / n))
      return { pair, sharedCells: count, lift: round(lift, 2) }
    })
    .sort((a, b) => b.lift * b.sharedCells - a.lift * a.sharedCells)
    .slice(0, 15)
}

function interventionEffects(observations: Observation[], interventions: Intervention[], now: number) {
  const problems = observations.filter((o) => !INTERVENTION_CATEGORIES.has(o.category))
  const windowMs = INTERVENTION_WINDOW_DAYS * DAY_MS
  return interventions
    .filter((i) => i.occurredAt.getTime() <= now)
    .map((i) => {
      const t = i.occurredAt.getTime()
      const nearby = problems.filter(
        (o) => haversineKm(i.latitude, i.longitude, o.latitude, o.longitude) <= INTERVENTION_RADIUS_KM,
      )
      const before = nearby.filter((o) => o.createdAt.getTime() < t && t - o.createdAt.getTime() <= windowMs)
      const after = nearby.filter((o) => o.createdAt.getTime() >= t && o.createdAt.getTime() - t <= windowMs)
      return {
        intervention: i.title,
        source: i.source,
        date: i.occurredAt.toISOString().slice(0, 10),
        area: cellOf(i.latitude, i.longitude).id,
        volunteers: i.volunteers,
        reportsWithin1_5kmBefore60d: before.length,
        reportsWithin1_5kmAfter60d: after.length,
        afterWindowComplete: now - t >= windowMs,
        topCategoriesBefore: topEntries(countBy(before, (o) => label(o.category)), 3),
        topCategoriesAfter: topEntries(countBy(after, (o) => label(o.category)), 3),
      }
    })
    .filter((e) => e.reportsWithin1_5kmBefore60d + e.reportsWithin1_5kmAfter60d > 0)
    .slice(0, 20)
}

export function buildAggregates(observations: Observation[], interventions: Intervention[], now = Date.now()) {
  const cells = buildCells(observations)
  return {
    totals: {
      observations: observations.length,
      byCategory: topEntries(countBy(observations, (o) => label(o.category)), 25),
      bySeverity: countBy(observations, (o) => o.severity),
    },
    geographic: geographic(cells, observations.length),
    temporal: temporal(observations, now),
    categoryCoOccurrenceByCell: coOccurrence(cells),
    interventions: interventionEffects(observations, interventions, now),
  }
}

export type Aggregates = ReturnType<typeof buildAggregates>

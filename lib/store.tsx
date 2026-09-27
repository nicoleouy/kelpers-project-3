"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  IMPACT_STATS,
  PROFILE_ACTIVITY,
  SEED_INCIDENTS,
  SEED_REPORTS,
  SEED_RESEARCH,
  SEED_VOLUNTEER,
  CURRENT_USER,
} from "./mock-data"
import type {
  Incident,
  ProfileActivity,
  Report,
  ResearchRequest,
  VolunteerOpportunity,
} from "./types"
import useSWR from "swr"
import { requestVerification, type VerificationState } from "./verification/client"
import { createReport, fetchReports } from "./reports/client"

export type NewReport = Omit<Report, "id" | "createdAt" | "confirmationCount" | "userId" | "userName">
export type SubmitReportResult = { ok: true; report: Report } | { ok: false; error: string }

function mergeReports(persisted: Report[], current: Report[]): Report[] {
  const byId = new Map(current.map((r) => [r.id, r]))
  const persistedIds = new Set(persisted.map((r) => r.id))
  const merged = [...persisted.map((r) => byId.get(r.id) ?? r), ...current.filter((r) => !persistedIds.has(r.id))]
  return merged.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

type ViewMode = "community" | "organization"

const VIEW_MODE_KEY = "kelpers-view-mode"
const FOLLOWING_KEY = "kelpers-following"

function readSession<T>(key: string, fallback: T, parse: (raw: string) => T | null): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return fallback
    return parse(raw) ?? fallback
  } catch {
    return fallback
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Ignore quota / private-mode failures.
  }
}

interface StoreValue {
  reports: Report[]
  incidents: Incident[]
  volunteer: VolunteerOpportunity[]
  research: ResearchRequest[]
  activity: ProfileActivity[]
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  following: string[]
  toggleFollow: (userId: string) => void
  /** Verifies with Gemini, persists via POST /api/reports, and only then adds the report to UI state. */
  submitReport: (r: NewReport) => Promise<SubmitReportResult>
  confirmReport: (id: string) => void
  toggleRegister: (id: string) => void
  toggleSave: (id: string) => void
  addVolunteer: (v: Omit<VolunteerOpportunity, "id" | "registeredCount" | "distanceMiles">) => void
  addResearch: (r: Omit<ResearchRequest, "id" | "createdAt" | "status">) => void
  respondToIncident: (id: string) => void
  observationCount: number
  verifications: Record<string, VerificationState>
  runVerification: (report: Report) => void
}

const RELATED_WINDOW_MS = 48 * 3_600_000
const RELATED_DEGREES = 0.05

function findRelatedReports(report: Report, all: Report[]): Report[] {
  const t = Date.parse(report.createdAt)
  return all
    .filter(
      (r) =>
        r.id !== report.id &&
        r.category === report.category &&
        Math.abs(r.latitude - report.latitude) < RELATED_DEGREES &&
        Math.abs(r.longitude - report.longitude) < RELATED_DEGREES &&
        Math.abs(Date.parse(r.createdAt) - t) < RELATED_WINDOW_MS,
    )
    .slice(0, 10)
}

const StoreContext = createContext<StoreValue | null>(null)

function findRelatedIncidentId(r: { latitude: number; longitude: number; category: string }, incidents: Incident[]) {
  const match = incidents.find((inc) => {
    const near = Math.abs(inc.latitude - r.latitude) < 0.05 && Math.abs(inc.longitude - r.longitude) < 0.05
    return near
  })
  return match?.id
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(SEED_REPORTS)
  const [incidents, setIncidents] = useState<Incident[]>(SEED_INCIDENTS)
  const [volunteer, setVolunteer] = useState<VolunteerOpportunity[]>(SEED_VOLUNTEER)
  const [research, setResearch] = useState<ResearchRequest[]>(SEED_RESEARCH)
  const [activity, setActivity] = useState<ProfileActivity[]>(PROFILE_ACTIVITY)
  const [viewMode, setViewModeState] = useState<ViewMode>("community")
  const [following, setFollowing] = useState<string[]>(["u-312"])
  const [verifications, setVerifications] = useState<Record<string, VerificationState>>({})

  useSWR("/api/reports", fetchReports, {
    revalidateOnFocus: false,
    onSuccess: (persisted) => setReports((prev) => mergeReports(persisted, prev)),
    onError: (err: Error) => console.error("[store] Failed to load persisted reports:", err.message),
  })

  // Runs independently of report submission: a failure only updates verification state, never the report.
  const runVerification = useCallback(
    (report: Report) => {
      setVerifications((prev) => ({ ...prev, [report.id]: { state: "pending" } }))
      const related = findRelatedReports(report, reports)
      void requestVerification(report, related).then((next) => {
        setVerifications((prev) => ({ ...prev, [report.id]: next }))
      })
    },
    [reports],
  )

  useEffect(() => {
    setViewModeState(readSession(VIEW_MODE_KEY, "community", (raw) => (raw === "organization" || raw === "community" ? raw : null)))
    setFollowing(
      readSession(FOLLOWING_KEY, ["u-312"], (raw) => {
        const parsed = JSON.parse(raw) as unknown
        return Array.isArray(parsed) && parsed.every((id) => typeof id === "string") ? parsed : null
      }),
    )
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    writeSession(VIEW_MODE_KEY, mode)
  }, [])

  const value = useMemo<StoreValue>(() => {
    const submitReport: StoreValue["submitReport"] = async (input) => {
      const draft: Report = {
        ...input,
        id: `draft-${Math.random().toString(36).slice(2, 9)}`,
        userId: CURRENT_USER.id,
        userName: CURRENT_USER.name,
        createdAt: new Date().toISOString(),
        confirmationCount: 0,
      }
      const verification = await requestVerification(draft, findRelatedReports(draft, reports))

      const saved = await createReport({
        category: input.category,
        description: input.description,
        severity: input.severity,
        latitude: input.latitude,
        longitude: input.longitude,
        tags: input.tags,
        image: input.image,
        approximateLocation: input.approximateLocation,
        isCrisis: input.isCrisis,
      })
      if (!saved.ok) return { ok: false, error: saved.error }

      const incidentId = input.incidentId ?? findRelatedIncidentId(saved.report, incidents)
      const report: Report = { ...saved.report, incidentId }
      commitReport(report)
      setVerifications((prev) => ({ ...prev, [report.id]: verification }))
      return { ok: true, report }
    }

    const commitReport = (report: Report) => {
      const { id, incidentId } = report
      setReports((prev) => [report, ...prev.filter((r) => r.id !== id)])
      if (incidentId) {
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === incidentId
              ? { ...inc, reportIds: [report.id, ...inc.reportIds], reportCount: inc.reportCount + 1 }
              : inc,
          ),
        )
      }
      setActivity((prev) => [
        {
          id: `act-${id}`,
          type: report.isCrisis ? "action" : "report",
          label: report.isCrisis ? "Reported a crisis" : "Submitted a report",
          location: report.approximateLocation,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        },
        ...prev,
      ])
    }

    const confirmReport: StoreValue["confirmReport"] = (id) => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                confirmedByMe: !r.confirmedByMe,
                confirmationCount: r.confirmationCount + (r.confirmedByMe ? -1 : 1),
              }
            : r,
        ),
      )
    }

    const toggleRegister: StoreValue["toggleRegister"] = (id) => {
      setVolunteer((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                registeredByMe: !v.registeredByMe,
                registeredCount: v.registeredCount + (v.registeredByMe ? -1 : 1),
              }
            : v,
        ),
      )
    }

    const toggleSave: StoreValue["toggleSave"] = (id) => {
      setVolunteer((prev) => prev.map((v) => (v.id === id ? { ...v, savedByMe: !v.savedByMe } : v)))
    }

    const addVolunteer: StoreValue["addVolunteer"] = (input) => {
      const id = `vol-${Math.random().toString(36).slice(2, 9)}`
      setVolunteer((prev) => [
        { ...input, id, registeredCount: 0, distanceMiles: Math.round(Math.random() * 60) / 10 + 1 },
        ...prev,
      ])
    }

    const addResearch: StoreValue["addResearch"] = (input) => {
      const id = `res-${Math.random().toString(36).slice(2, 9)}`
      setResearch((prev) => [
        { ...input, id, status: "submitted", createdAt: new Date().toISOString() },
        ...prev,
      ])
    }

    const respondToIncident: StoreValue["respondToIncident"] = (id) => {
      setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status: "responding" } : inc)))
    }

    const toggleFollow: StoreValue["toggleFollow"] = (userId) => {
      if (!userId || userId === CURRENT_USER.id) return
      setFollowing((prev) => {
        const next = prev.includes(userId) ? prev.filter((id) => id !== userId) : [userId, ...prev]
        writeSession(FOLLOWING_KEY, JSON.stringify(next))
        return next
      })
    }

    return {
      reports,
      incidents,
      volunteer,
      research,
      activity,
      viewMode,
      setViewMode,
      following,
      toggleFollow,
      submitReport,
      confirmReport,
      toggleRegister,
      toggleSave,
      addVolunteer,
      addResearch,
      respondToIncident,
      observationCount: IMPACT_STATS.observationsThisMonth + Math.max(0, reports.length - SEED_REPORTS.length),
      verifications,
      runVerification,
    }
  }, [reports, incidents, volunteer, research, activity, viewMode, following, setViewMode, verifications, runVerification])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, ClipboardList, Plus, TrendingUp, Users } from "lucide-react"
import { IncidentCard } from "@/components/incident-card"
import { IncidentDetail } from "@/components/incident-detail"
import { ReportDetail } from "@/components/report-detail"
import { OpportunityCard } from "@/components/opportunity-card"
import { OpportunityDetail } from "@/components/opportunity-detail"
import { DetailPanel } from "@/components/detail-panel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { ORGANIZATIONS } from "@/lib/mock-data"
import type { CauseTag } from "@/lib/types"

const ORG = ORGANIZATIONS[1] // Trees Atlanta as the signed-in org
const CAUSE_OPTIONS: CauseTag[] = ["Litter", "Water", "Wildlife", "Trees", "Conservation", "Climate", "Community", "Education"]

export default function OrganizationPage() {
  const router = useRouter()
  const { incidents, volunteer, reports, addVolunteer, setViewMode } = useStore()
  const [selected, setSelected] = useState<{ kind: "report" | "incident" | "opportunity"; id: string } | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    setViewMode("organization")
  }, [setViewMode])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [date, setDate] = useState("Saturday")
  const [time, setTime] = useState("9:00 AM")
  const [capacity, setCapacity] = useState("30")
  const [causes, setCauses] = useState<CauseTag[]>(["Conservation"])

  const orgOpps = useMemo(() => volunteer.filter((v) => v.organizationName === ORG.name), [volunteer])
  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== "resolved").sort((a, b) => b.reportCount - a.reportCount),
    [incidents],
  )
  const totalRegistered = orgOpps.reduce((sum, o) => sum + o.registeredCount, 0)

  const selectedReport = selected?.kind === "report" ? reports.find((r) => r.id === selected.id) : undefined
  const selectedIncident = selected?.kind === "incident" ? incidents.find((i) => i.id === selected.id) : undefined
  const selectedOpportunity =
    selected?.kind === "opportunity" ? volunteer.find((o) => o.id === selected.id) : undefined

  const toggleCause = (c: CauseTag) =>
    setCauses((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  const publish = () => {
    if (!title.trim()) return
    addVolunteer({
      organizationId: ORG.id,
      organizationName: ORG.name,
      title: title.trim(),
      description: description.trim() || "Join us to make a local impact.",
      location: location.trim() || "Atlanta",
      latitude: 33.749 + (Math.random() - 0.5) * 0.05,
      longitude: -84.388 + (Math.random() - 0.5) * 0.05,
      date,
      time,
      duration: "2 hours",
      categories: causes,
      tags: causes,
      capacity: Number(capacity) || 30,
      setting: "Outdoor",
      skillLevel: "Any",
    })
    setShowForm(false)
    setTitle("")
    setDescription("")
    setLocation("")
  }

  const stats = [
    { label: "Active incidents", value: activeIncidents.length, icon: TrendingUp },
    { label: "Your opportunities", value: orgOpps.length, icon: ClipboardList },
    { label: "Total volunteers", value: totalRegistered, icon: Users },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span
            className="grid size-16 place-items-center rounded-2xl font-display text-xl font-bold text-white shadow"
            style={{ backgroundColor: ORG.logoColor }}
          >
            {ORG.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="flex-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Building2 className="size-3.5" />
              Organization dashboard
            </span>
            <h1 className="font-display text-3xl font-semibold">{ORG.name}</h1>
            <p className="max-w-xl text-sm text-muted-foreground">{ORG.description}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setViewMode("community")
              router.push("/")
            }}
            className="self-start rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            Switch to community view
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-4">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-display text-2xl font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Incidents needing response */}
      <section>
        <h2 className="mb-3 font-display text-2xl font-semibold">Incidents in your area</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          AI-grouped incidents from community reports. Mark that your organization is responding to keep the community
          informed.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {activeIncidents.map((inc) => (
            <IncidentCard key={inc.id} incident={inc} onOpen={() => setSelected({ kind: "incident", id: inc.id })} />
          ))}
        </div>
      </section>

      {/* Manage opportunities */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Your opportunities</h2>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="size-4" />
            Post opportunity
          </Button>
        </div>

        {showForm && (
          <div className="mb-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold">New volunteer opportunity</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Neighborhood Tree Planting"
                  className="rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What will volunteers do?"
                  className="resize-none rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Location</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Atlanta BeltLine"
                  className="rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Capacity</span>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Day</span>
                <input
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Time</span>
                <input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <div className="sm:col-span-2">
                <span className="mb-2 block text-sm font-medium">Causes</span>
                <div className="flex flex-wrap gap-2">
                  {CAUSE_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCause(c)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        causes.includes(c) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={publish} disabled={!title.trim()}>
                <Check className="size-4" />
                Publish
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgOpps.map((o) => (
            <OpportunityCard key={o.id} opp={o} />
          ))}
        </div>
      </section>

      <DetailPanel
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selectedIncident ? "Incident" : selected?.kind === "opportunity" ? "Opportunity" : "Report"}
      >
        {selectedReport && (
          <ReportDetail
            report={selectedReport}
            onOpenIncident={(id) => setSelected({ kind: "incident", id })}
            onOpenOpportunity={(id) => setSelected({ kind: "opportunity", id })}
          />
        )}
        {selectedIncident && (
          <IncidentDetail
            incident={selectedIncident}
            onOpenReport={(id) => setSelected({ kind: "report", id })}
            onOpenOpportunity={(id) => setSelected({ kind: "opportunity", id })}
          />
        )}
        {selectedOpportunity && <OpportunityDetail opp={selectedOpportunity} />}
      </DetailPanel>
    </div>
  )
}

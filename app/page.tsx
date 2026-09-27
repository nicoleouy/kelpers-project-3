"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarPlus, Heart, MapPinned, Megaphone, Plus, Sparkles } from "lucide-react"
import { MapView } from "@/components/map/map-view"
import { ReportCard } from "@/components/report-card"
import { ReportDetail } from "@/components/report-detail"
import { IncidentDetail } from "@/components/incident-detail"
import { OpportunityDetail } from "@/components/opportunity-detail"
import { DetailPanel } from "@/components/detail-panel"
import { useStore } from "@/lib/store"
import { IMPACT_STATS } from "@/lib/mock-data"

const INITIATIVE_HIGHLIGHTS = [
  { icon: MapPinned, label: "Explore the visualization & nearby incidents" },
  { icon: Megaphone, label: "Report what you see" },
  { icon: CalendarPlus, label: "Join or plan an upcoming event" },
]

export default function HomePage() {
  const { reports, incidents, volunteer, observationCount } = useStore()
  const [selected, setSelected] = useState<{ kind: "report" | "incident" | "opportunity"; id: string } | null>(null)

  const selectedReport = selected?.kind === "report" ? reports.find((r) => r.id === selected.id) : undefined
  const selectedIncident = selected?.kind === "incident" ? incidents.find((i) => i.id === selected.id) : undefined
  const selectedOpportunity = selected?.kind === "opportunity" ? volunteer.find((o) => o.id === selected.id) : undefined
  const volunteerSignups = volunteer.reduce((sum, o) => sum + o.registeredCount, 0)
  const panelTitle = selectedIncident ? "Incident" : selectedOpportunity ? "Opportunity" : "Report"

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/20 px-6 py-12 md:px-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/kelpers-logo.jpeg" alt="kelpers logo" className="size-full object-cover" />
              </span>
              <span className="font-display text-2xl font-semibold tracking-tight">kelpers</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
              <Sparkles className="size-3.5" />
              Good already underway
            </span>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Neighbors are already making a difference.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
              This month the community logged{" "}
              <span className="font-semibold text-foreground">{observationCount.toLocaleString()}</span> observations,
              watched{" "}
              <span className="font-semibold text-foreground">{IMPACT_STATS.likelyIncidents.toLocaleString()}</span> likely
              incidents, and filled{" "}
              <span className="font-semibold text-foreground">{volunteerSignups.toLocaleString()}</span> volunteer spots.
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-2 sm:max-w-lg">
              {[
                { label: "Observations", value: observationCount.toLocaleString() },
                { label: "Likely incidents", value: IMPACT_STATS.likelyIncidents.toLocaleString() },
                { label: "Volunteer signups", value: volunteerSignups.toLocaleString() },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-card/80 px-3 py-3 text-center shadow-sm">
                  <dt className="text-[11px] font-medium text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 font-display text-xl font-semibold tabular-nums md:text-2xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/help"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.03]"
              >
                <Heart className="size-4" />
                Join the work
              </Link>
            </div>
          </div>

          <div
            className="relative isolate h-[300px] overflow-hidden rounded-3xl border border-border shadow-sm md:h-[380px] lg:h-[440px]"
            aria-label="Map of community reports and incidents"
          >
            <MapView
              reports={reports}
              incidents={incidents}
              opportunities={volunteer}
              onSelect={(kind, id) => setSelected({ kind, id })}
            />
          </div>
        </div>
      </section>

      {/* Take initiatives */}
      <section aria-labelledby="take-initiatives-heading">
        <Link
          href="/initiatives"
          className="group flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:flex-row md:items-center md:justify-between md:p-8"
        >
          <div className="max-w-xl">
            <h2 id="take-initiatives-heading" className="font-display text-2xl font-semibold">
              Take Initiatives
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              See what&apos;s happening nearby, report an issue, and organise action with your community.
            </p>
            <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
              {INITIATIVE_HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform group-hover:scale-[1.03] md:self-center">
            Take initiative
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </section>

      {/* Recent reports */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold">Recent observations</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {reports.slice(0, 6).map((r) => (
            <ReportCard key={r.id} report={r} onOpen={() => setSelected({ kind: "report", id: r.id })} />
          ))}
        </div>
      </section>

      {/* Impact banner */}
      <section className="overflow-hidden rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground md:py-12">
        <p className="text-sm font-medium uppercase tracking-wide text-primary-foreground/70">Community impact</p>
        <p className="mx-auto mt-2 max-w-2xl text-balance font-display text-2xl font-semibold md:text-3xl">
          Your community has contributed{" "}
          <span className="tabular-nums">{observationCount.toLocaleString()}</span> observations this month.
        </p>
        <Link
          href="/report"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-semibold text-primary transition-transform hover:scale-[1.03]"
        >
          <Plus className="size-4" />
          Add your observation
        </Link>
      </section>

      <DetailPanel open={Boolean(selected)} onClose={() => setSelected(null)} title={panelTitle}>
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

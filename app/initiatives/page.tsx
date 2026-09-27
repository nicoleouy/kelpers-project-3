"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Map as MapIcon, Megaphone, Plus, TrendingUp } from "lucide-react"
import { MapView } from "@/components/map/map-view"
import { MapLegend } from "@/components/map-legend"
import { IncidentCard } from "@/components/incident-card"
import { OpportunityCard } from "@/components/opportunity-card"
import { ReportDetail } from "@/components/report-detail"
import { IncidentDetail } from "@/components/incident-detail"
import { OpportunityDetail } from "@/components/opportunity-detail"
import { DetailPanel } from "@/components/detail-panel"
import { PlanEventCard } from "@/components/initiatives/plan-event-card"
import { useStore } from "@/lib/store"

type Selection = { kind: "report" | "incident" | "opportunity"; id: string }

export default function InitiativesPage() {
  const { reports, incidents, volunteer } = useStore()
  const [selected, setSelected] = useState<Selection | null>(null)

  const selectedReport = selected?.kind === "report" ? reports.find((r) => r.id === selected.id) : undefined
  const selectedIncident = selected?.kind === "incident" ? incidents.find((i) => i.id === selected.id) : undefined
  const selectedOpportunity = selected?.kind === "opportunity" ? volunteer.find((o) => o.id === selected.id) : undefined
  const panelTitle = selectedIncident ? "Incident" : selectedOpportunity ? "Opportunity" : "Report"

  return (
    <div className="flex flex-col gap-12">
      <header>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Take Initiatives</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
          Understand what&apos;s happening around you, report new issues, and organise action with your neighbours.
        </p>
      </header>

      {/* Visualization */}
      <section aria-labelledby="visualization-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="visualization-heading" className="flex items-center gap-2 font-display text-2xl font-semibold">
              <MapIcon className="size-5 text-primary" aria-hidden />
              Visualization
            </h2>
            <p className="text-sm text-muted-foreground">Live environmental reports and incidents from your community.</p>
          </div>
          <Link href="/map" className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex">
            Full map
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="relative isolate h-[360px] overflow-hidden rounded-3xl border border-border shadow-sm md:h-[460px]">
          <MapView
            reports={reports}
            incidents={incidents}
            opportunities={volunteer}
            onSelect={(kind, id) => setSelected({ kind, id })}
          />
          <MapLegend />
        </div>
      </section>

      {/* Nearby incidents */}
      <section aria-labelledby="nearby-incidents-heading">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" aria-hidden />
          <h2 id="nearby-incidents-heading" className="font-display text-2xl font-semibold">
            Nearby incidents
          </h2>
        </div>
        {incidents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {incidents.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} onOpen={() => setSelected({ kind: "incident", id: inc.id })} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No incidents nearby right now.
          </p>
        )}
      </section>

      {/* Report */}
      <section
        aria-labelledby="report-heading"
        className="flex flex-col gap-5 rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/20 p-6 md:flex-row md:items-center md:justify-between md:p-8"
      >
        <div className="max-w-xl">
          <h2 id="report-heading" className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Megaphone className="size-5 text-primary" aria-hidden />
            Report an issue
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Spotted pollution, dumping, damaged habitat, or another environmental problem? Submit a report so it&apos;s
            verified, added to the map, and grouped with similar observations to help your community respond.
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.03] md:self-center"
        >
          <Plus className="size-4" />
          Submit a report
        </Link>
      </section>

      {/* Upcoming events + plan an event */}
      <section aria-labelledby="events-heading" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" aria-hidden />
            <h2 id="events-heading" className="font-display text-2xl font-semibold">
              Upcoming events
            </h2>
          </div>
          {volunteer.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {volunteer.map((o) => (
                <OpportunityCard key={o.id} opp={o} onOpen={() => setSelected({ kind: "opportunity", id: o.id })} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No upcoming events yet. Be the first to plan one.
            </p>
          )}
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <PlanEventCard />
        </div>
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

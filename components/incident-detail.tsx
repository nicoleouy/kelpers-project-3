"use client"

import { ArrowDown, ArrowRight, CalendarDays, HandHeart, MapPin, Radio, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CategoryIcon } from "@/components/category-icon"
import { SeverityBadge } from "@/components/severity-badge"
import { ReportCard } from "@/components/report-card"
import { ListenButton } from "@/components/listen-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { categoryMeta } from "@/lib/categories"
import { formatDateTime } from "@/lib/format"
import { matchOpportunity } from "@/lib/help-matching"
import { useStore } from "@/lib/store"
import type { Incident } from "@/lib/types"

export function IncidentDetail({
  incident,
  onOpenReport,
  onOpenOpportunity,
}: {
  incident: Incident
  onOpenReport?: (reportId: string) => void
  onOpenOpportunity?: (opportunityId: string) => void
}) {
  const router = useRouter()
  const { reports, viewMode, respondToIncident, volunteer } = useStore()
  const meta = categoryMeta(incident.category)
  const memberReports = incident.reportIds
    .map((id) => reports.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
  const match = matchOpportunity(incident, volunteer)

  const speech =
    `${incident.title}. ${incident.groupingConfidenceLabel}. Severity: ${incident.severity}. ` +
    `${incident.reportCount} community reports were grouped into this incident near ${incident.approximateLocation}. ` +
    `${incident.description}`

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-12 place-items-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: meta.color }}>
          <CategoryIcon name={meta.icon} className="size-6" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-semibold leading-tight">{incident.title}</h3>
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {incident.approximateLocation}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {incident.aiGrouped && (
          <Badge className="gap-1 bg-primary/10 text-primary">
            <Sparkles className="size-3" />
            AI grouped
          </Badge>
        )}
        <SeverityBadge severity={incident.severity} />
        <Badge variant="outline" className="font-normal">
          {incident.groupingConfidenceLabel}
        </Badge>
        <ListenButton text={speech} label="Listen" size="sm" className="ml-auto" />
      </div>

      {/* AI grouping visual */}
      <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">{incident.reportCount}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">community reports</span>
          <ArrowDown className="size-4 text-muted-foreground" />
          <Badge className="gap-1 bg-primary/10 text-primary">
            <Sparkles className="size-3" />
            AI grouping
          </Badge>
          <ArrowDown className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">1 likely incident</span>
        </div>
        <p className="mt-3 text-pretty text-xs leading-relaxed text-muted-foreground">{incident.description}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-border">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" /> First reported
          </dt>
          <dd className="mt-1 font-medium">{formatDateTime(incident.firstReportedAt)}</dd>
        </div>
        <div className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-border">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" /> Latest report
          </dt>
          <dd className="mt-1 font-medium">{formatDateTime(incident.lastReportedAt)}</dd>
        </div>
      </dl>

      {viewMode === "organization" && (
        <Button
          className="w-full"
          variant={incident.status === "responding" ? "secondary" : "default"}
          onClick={() => respondToIncident(incident.id)}
        >
          <Radio className="size-4" />
          {incident.status === "responding" ? "Your organization is responding" : "Respond to this incident"}
        </Button>
      )}

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <HandHeart className="size-4 text-primary" />
          How you can help
        </p>
          {match ? (
            <button
              type="button"
              onClick={() => {
                if (onOpenOpportunity) onOpenOpportunity(match.id)
                else router.push(`/map?focus=opportunity:${match.id}`)
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
            >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <CategoryIcon name="HeartPulse" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{match.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {match.organizationName} · {match.distanceMiles} mi · {match.date}
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary" />
          </button>
        ) : (
          <Link
            href="/help"
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <HandHeart className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Explore ways to help</span>
              <span className="block text-xs text-muted-foreground">Find volunteer events and cleanups near you</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Contributing reports</h4>
        <div className="flex flex-col gap-2">
          {memberReports.map((r) => (
            <ReportCard key={r.id} report={r} onOpen={() => onOpenReport?.(r.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

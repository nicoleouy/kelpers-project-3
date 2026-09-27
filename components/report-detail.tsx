"use client"

import { ArrowRight, CalendarDays, Check, HandHeart, MapPin, Sparkles, Tag, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CategoryIcon } from "@/components/category-icon"
import { SeverityBadge } from "@/components/severity-badge"
import { FollowButton } from "@/components/follow-button"
import { ListenButton } from "@/components/listen-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { categoryMeta } from "@/lib/categories"
import { formatDateTime } from "@/lib/format"
import { matchOpportunity } from "@/lib/help-matching"
import { CURRENT_USER } from "@/lib/mock-data"
import { useStore } from "@/lib/store"
import type { Report } from "@/lib/types"

export function ReportDetail({
  report,
  onOpenIncident,
  onOpenOpportunity,
}: {
  report: Report
  onOpenIncident?: (incidentId: string) => void
  onOpenOpportunity?: (opportunityId: string) => void
}) {
  const router = useRouter()
  const { confirmReport, incidents, volunteer } = useStore()
  const meta = categoryMeta(report.category)
  const incident = report.incidentId ? incidents.find((i) => i.id === report.incidentId) : undefined
  const match = matchOpportunity(report, volunteer)
  const isOwnReport = report.userId === CURRENT_USER.id

  const speech =
    `${meta.label} report. Severity: ${report.severity}. ` +
    `${report.description} ` +
    `Reported near ${report.approximateLocation} on ${formatDateTime(report.createdAt)}, ` +
    `with ${report.confirmationCount} community confirmations.`

  return (
    <div className="flex flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-accent/50">
        {report.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.image || "/placeholder.svg"} alt={meta.label} className="size-full object-cover" />
        ) : (
          <span
            className="grid size-full place-items-center"
            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
          >
            <CategoryIcon name={meta.icon} className="size-16" />
          </span>
        )}
        <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur">
          <span className="grid size-5 place-items-center rounded-full text-white" style={{ backgroundColor: meta.color }}>
            <CategoryIcon name={meta.icon} className="size-3" />
          </span>
          {meta.label}
        </span>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <SeverityBadge severity={report.severity} />
          {report.isCrisis && <Badge variant="crisis">Crisis report</Badge>}
          <ListenButton text={speech} label="Listen" size="sm" className="ml-auto" />
        </div>

        <p className="text-pretty leading-relaxed">{report.description}</p>

        {!isOwnReport && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: meta.color }}
            >
              {report.userName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{report.userName}</p>
              <p className="text-xs text-muted-foreground">Reported this observation</p>
            </div>
            <FollowButton userId={report.userId} size="sm" />
          </div>
        )}

        <dl className="grid gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span>{report.approximateLocation}</span>
            <Badge variant="secondary" className="ml-auto font-normal">
              Approximate
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <span>{formatDateTime(report.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4 shrink-0 text-primary" />
            <span>{report.confirmationCount} community confirmations</span>
          </div>
          {report.tags.length > 0 && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Tag className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="flex flex-wrap gap-1.5">
                {report.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="font-normal">
                    {t}
                  </Badge>
                ))}
              </span>
            </div>
          )}
        </dl>

        {incident && (
          <button
            type="button"
            onClick={() => onOpenIncident?.(incident.id)}
            className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
          >
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Part of a likely incident</span>
              <span className="block text-xs text-muted-foreground">
                {incident.title} · {incident.reportCount} related reports
              </span>
            </span>
          </button>
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
                <span className="block text-xs text-muted-foreground">
                  Find volunteer events and cleanups near you
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          )}
        </div>

        <div className="rounded-2xl bg-secondary/60 p-4">
          <p className="text-sm font-medium">Are you seeing this too?</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Confirm if you can observe the same issue nearby. This helps the community verify what&apos;s happening.
          </p>
          <Button
            variant={report.confirmedByMe ? "secondary" : "default"}
            className="w-full"
            onClick={() => confirmReport(report.id)}
          >
            <Check className="size-4" />
            {report.confirmedByMe ? "Confirmed by you" : "Confirm this observation"}
          </Button>
        </div>
      </div>
    </div>
  )
}

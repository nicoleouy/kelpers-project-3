"use client"

import { MapPin, Users } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import { SeverityBadge } from "@/components/severity-badge"
import { Badge } from "@/components/ui/badge"
import { categoryMeta } from "@/lib/categories"
import { relativeTime } from "@/lib/format"
import { useStore } from "@/lib/store"
import type { Report } from "@/lib/types"
import { VerificationBadge } from "@/components/verification-status"

export function ReportCard({ report, onOpen }: { report: Report; onOpen?: () => void }) {
  const meta = categoryMeta(report.category)
  const { verifications } = useStore()
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-accent/50">
        {report.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.image || "/placeholder.svg"}
            alt={meta.label}
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <span
            className="grid size-full place-items-center"
            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
          >
            <CategoryIcon name={meta.icon} className="size-7" />
          </span>
        )}
        <span
          className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full text-white shadow"
          style={{ backgroundColor: meta.color }}
        >
          <CategoryIcon name={meta.icon} className="size-3.5" />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{meta.label}</span>
          <SeverityBadge severity={report.severity} />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{report.description}</p>
        <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{report.approximateLocation}</span>
          </span>
          <span className="shrink-0">{relativeTime(report.createdAt)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report.confirmationCount > 0 && (
            <Badge variant="secondary" className="gap-1 whitespace-nowrap font-normal">
              <Users className="size-3" />
              {report.confirmationCount} confirmed
            </Badge>
          )}
          {report.incidentId && (
            <Badge variant="outline" className="whitespace-nowrap font-normal text-primary">
              Part of an incident
            </Badge>
          )}
          <VerificationBadge verification={verifications[report.id]} />
        </div>
      </div>
    </button>
  )
}

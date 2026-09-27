"use client"

import { useMemo, useState } from "react"
import { Bookmark, HandHeart, SlidersHorizontal } from "lucide-react"
import { OpportunityCard } from "@/components/opportunity-card"
import { OpportunityDetail } from "@/components/opportunity-detail"
import { DetailPanel } from "@/components/detail-panel"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { ORGANIZATIONS } from "@/lib/mock-data"
import type { CauseTag } from "@/lib/types"

const CAUSES: CauseTag[] = [
  "Litter",
  "Water",
  "Wildlife",
  "Trees",
  "Conservation",
  "Recycling",
  "Climate",
  "Community",
  "Education",
]

const SETTINGS = ["All", "Outdoor", "Indoor"] as const
const SORTS = [
  { label: "Nearest", value: "distance" },
  { label: "Most spots left", value: "spots" },
  { label: "Most popular", value: "popular" },
] as const

export default function HelpPage() {
  const { volunteer } = useStore()
  const [cause, setCause] = useState<CauseTag | "all">("all")
  const [setting, setSetting] = useState<(typeof SETTINGS)[number]>("All")
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("distance")
  const [savedOnly, setSavedOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = volunteer.find((o) => o.id === selectedId)

  const list = useMemo(() => {
    let items = [...volunteer]
    if (cause !== "all") items = items.filter((o) => o.categories.includes(cause))
    if (setting !== "All") items = items.filter((o) => o.setting === setting)
    if (savedOnly) items = items.filter((o) => o.savedByMe)
    items.sort((a, b) => {
      if (sort === "distance") return a.distanceMiles - b.distanceMiles
      if (sort === "spots") return b.capacity - b.registeredCount - (a.capacity - a.registeredCount)
      return b.registeredCount - a.registeredCount
    })
    return items
  }, [volunteer, cause, setting, sort, savedOnly])

  return (
    <div className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-3xl bg-primary/8 p-6 md:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <HandHeart className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold">Turn awareness into action</h1>
        <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">
          Find volunteer opportunities from local organizations, many connected directly to issues reported in your
          community.
        </p>
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCause("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              cause === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            All causes
          </button>
          {CAUSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCause(c)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                cause === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
            {SETTINGS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSetting(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  setting === s ? "bg-secondary text-foreground" : "text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="size-4" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setSavedOnly((s) => !s)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              savedOnly ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground",
            )}
          >
            <Bookmark className={cn("size-3.5", savedOnly && "fill-current")} />
            Saved
          </button>

          <span className="ml-auto text-sm text-muted-foreground">{list.length} opportunities</span>
        </div>
      </div>

      {list.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((o) => (
            <OpportunityCard key={o.id} opp={o} onOpen={() => setSelectedId(o.id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center">
          <p className="font-medium">No opportunities found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try changing your filters or selecting another cause.
          </p>
        </div>
      )}

      {/* Partner organizations */}
      <section>
        <h2 className="mb-3 font-display text-2xl font-semibold">Partner organizations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORGANIZATIONS.map((org) => (
            <div key={org.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span
                className="grid size-10 place-items-center rounded-xl font-display text-sm font-bold text-white"
                style={{ backgroundColor: org.logoColor }}
              >
                {org.name.slice(0, 2).toUpperCase()}
              </span>
              <p className="mt-3 font-semibold leading-tight">{org.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{org.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {org.categories.slice(0, 3).map((c) => (
                  <Badge key={c} variant="secondary" className="font-normal">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <DetailPanel open={Boolean(selected)} onClose={() => setSelectedId(null)} title="Opportunity">
        {selected && <OpportunityDetail opp={selected} />}
      </DetailPanel>
    </div>
  )
}

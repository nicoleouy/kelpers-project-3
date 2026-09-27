"use client"

import { useState } from "react"
import useSWR from "swr"
import { AlertTriangle, Check, Lightbulb, Loader2, MapPin, RefreshCw, Sparkles, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DataProfile, IntelligenceResponse } from "@/lib/intelligence/types"
import type { Insight } from "@/lib/intelligence/schema"

const fetcher = async (url: string): Promise<IntelligenceResponse> => {
  const res = await fetch(url)
  return res.json()
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "geographic", label: "Geographic" },
  { id: "temporal", label: "Temporal" },
  { id: "category", label: "Category" },
  { id: "intervention", label: "Interventions" },
  { id: "cross-cutting", label: "Cross-cutting" },
] as const

const CONFIDENCE_STYLE: Record<Insight["confidence"], string> = {
  high: "bg-primary/12 text-primary",
  medium: "bg-[#ca8a04]/12 text-[#a16207]",
  low: "bg-muted text-muted-foreground",
}

const CAPABILITY_LABELS: Record<keyof DataProfile["capabilities"], string> = {
  geographic: "Geographic patterns",
  temporalTrends: "Trends over time",
  seasonality: "Seasonality",
  categoryRelationships: "Category relationships",
  interventions: "Intervention effects",
}

export function IntelligencePanel() {
  const { data, isLoading, isValidating, mutate } = useSWR("/api/intelligence", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all")

  const refresh = () => mutate(fetcher("/api/intelligence?refresh=1"), { revalidate: false })

  return (
    <section aria-labelledby="intel-heading" className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[#0369a1]" aria-hidden />
            <h2 id="intel-heading" className="font-display text-lg font-semibold">
              Pattern intelligence
            </h2>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Grok
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">
            What thousands of small, verified observations reveal together — patterns no single reporter or
            organization could see on their own.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={isLoading || isValidating}>
          <RefreshCw className={cn("size-4", isValidating && "animate-spin")} aria-hidden />
          Re-analyze
        </Button>
      </header>

      <div className="mt-5" aria-live="polite">
        {isLoading || (!data && isValidating) ? (
          <LoadingState />
        ) : !data || data.status === "error" ? (
          <div className="flex items-start gap-3 rounded-2xl bg-destructive/8 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <p>{data && data.status === "error" ? data.error : "Could not load pattern analysis."}</p>
          </div>
        ) : data.status === "insufficient-data" ? (
          <InsufficientState profile={data.profile} minimum={data.minimumObservations} />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl bg-[#0369a1]/8 p-4">
              <p className="font-display text-base font-semibold text-balance">{data.analysis.headline}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{data.analysis.overview}</p>
            </div>

            <CoverageStrip profile={data.profile} />

            {data.analysis.earlyWarnings.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="size-4 text-[#ca8a04]" aria-hidden />
                  Early warnings
                </h3>
                <ul className="grid gap-2 md:grid-cols-2">
                  {data.analysis.earlyWarnings.map((w, i) => (
                    <li key={i} className="rounded-2xl border border-[#ca8a04]/30 bg-[#ca8a04]/6 p-3 text-sm">
                      <p className="font-medium">{w.signal}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden />
                        {w.area}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Watch for: </span>
                        {w.watchFor}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter insights by dimension">
                {FILTERS.map((f) => {
                  const count =
                    f.id === "all"
                      ? data.analysis.insights.length
                      : data.analysis.insights.filter((i) => i.dimension === f.id).length
                  if (f.id !== "all" && count === 0) return null
                  return (
                    <button
                      key={f.id}
                      role="tab"
                      aria-selected={filter === f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        filter === f.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {f.label} <span className="opacity-60">{count}</span>
                    </button>
                  )
                })}
              </div>
              <ul className="grid gap-3 lg:grid-cols-2">
                {data.analysis.insights
                  .filter((i) => filter === "all" || i.dimension === filter)
                  .map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}
              </ul>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ListBlock title="Research questions" icon={<Lightbulb className="size-4 text-[#0369a1]" aria-hidden />} items={data.analysis.researchQuestions} />
              <ListBlock title="Data limitations" icon={<AlertTriangle className="size-4 text-muted-foreground" aria-hidden />} items={data.analysis.dataLimitations} />
            </div>

            <p className="text-xs text-muted-foreground">
              Analyzed {data.profile.observationCount.toLocaleString()} observations and{" "}
              {data.profile.interventionCount.toLocaleString()} interventions ·{" "}
              {new Date(data.generatedAt).toLocaleString()} · Patterns show association, not causation.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize">
          {insight.kind.replace(/-/g, " ")}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", CONFIDENCE_STYLE[insight.confidence])}>
          {insight.confidence} confidence
        </span>
      </div>
      <h4 className="font-display text-sm font-semibold text-balance">{insight.title}</h4>
      <p className="text-sm leading-relaxed">{insight.finding}</p>
      {insight.evidence.length > 0 && (
        <ul className="flex flex-col gap-1 border-l-2 border-[#0369a1]/30 pl-3 text-xs text-muted-foreground">
          {insight.evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Why it matters: </span>
        {insight.whyItMatters}
      </p>
      {insight.suggestedActions.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {insight.suggestedActions.map((a, i) => (
            <li key={i} className="flex gap-1.5">
              <Check className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
              {a}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap gap-1 pt-1">
        {insight.audiences.map((a) => (
          <Badge key={a} variant="outline" className="text-[10px] capitalize">
            {a}
          </Badge>
        ))}
        {insight.areas.slice(0, 3).map((a) => (
          <span key={a} className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <MapPin className="size-3" aria-hidden />
            {a}
          </span>
        ))}
      </div>
    </li>
  )
}

function ListBlock({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="rounded-2xl bg-secondary/40 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
        {items.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ul>
    </div>
  )
}

function CoverageStrip({ profile }: { profile: DataProfile }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Analysis coverage">
      {(Object.keys(CAPABILITY_LABELS) as (keyof DataProfile["capabilities"])[]).map((k) => {
        const on = profile.capabilities[k]
        return (
          <li
            key={k}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
              on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground line-through decoration-muted-foreground/40",
            )}
          >
            {on ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
            {CAPABILITY_LABELS[k]}
            <span className="sr-only">{on ? "(analyzed)" : "(not enough data)"}</span>
          </li>
        )
      })}
    </ul>
  )
}

function InsufficientState({ profile, minimum }: { profile: DataProfile; minimum: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-secondary/40 p-5">
      <p className="text-sm">
        <span className="font-semibold">Not enough data for pattern analysis yet.</span> The database has{" "}
        {profile.observationCount} verified observation{profile.observationCount === 1 ? "" : "s"}; long-term
        analysis starts at {minimum}. Patterns will appear here automatically as the community reports more.
      </p>
      <CoverageStrip profile={profile} />
      <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
        {profile.gaps.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Aggregating observations and looking for long-term patterns…
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-secondary/60" />
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, MapPinOff, RotateCw } from "lucide-react"
import { MapView } from "./map-view"
import type { FocusTarget } from "./eco-map"
import { useHeatmap } from "@/lib/heatmap/client"
import { HEATMAP_CATEGORIES, type HeatmapCategory } from "@/lib/heatmap/types"
import { cn } from "@/lib/utils"

const NO_REPORTS: never[] = []

const LEGEND_GRADIENT: Record<HeatmapCategory, string> = {
  community: "linear-gradient(to right, #e9d5ff, #a855f7, #7e22ce, #3b0764)",
  crisis: "linear-gradient(to right, #fecaca, #ef4444, #b91c1c, #450a0a)",
}

export function LiveHeatmap({ focus = null, className }: { focus?: FocusTarget | null; className?: string }) {
  const [category, setCategory] = useState<HeatmapCategory>("community")
  const { data, error, isLoading, isValidating, mutate } = useHeatmap(category)

  const current = data?.category === category ? data : undefined
  const label = HEATMAP_CATEGORIES.find((c) => c.id === category)!.label

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Heatmap category" className="flex rounded-full border border-border bg-card p-1">
          {HEATMAP_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                category === c.id
                  ? c.id === "crisis"
                    ? "bg-crisis text-white"
                    : "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {isValidating && <Loader2 className="size-3 animate-spin" aria-hidden />}
          {current ? `${current.total} ${current.total === 1 ? "observation" : "observations"} · live from Tiger Data` : "Live from Tiger Data"}
        </p>
      </div>

      <div
        className={cn(
          "relative isolate h-[360px] overflow-hidden rounded-3xl border border-border shadow-sm md:h-[460px]",
          className,
        )}
      >
        <MapView
          reports={NO_REPORTS}
          incidents={NO_REPORTS}
          focus={focus}
          heat={current ? { cells: current.cells, maxCount: current.maxCount, category } : undefined}
        />

        {!current && isLoading && (
          <Overlay>
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">Loading {label.toLowerCase()}…</p>
          </Overlay>
        )}
        {error && !current && (
          <Overlay>
            <AlertTriangle className="size-6 text-crisis" aria-hidden />
            <p className="text-sm font-medium">{"Couldn't load map data right now."}</p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-1 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
            >
              <RotateCw className="size-3.5" aria-hidden />
              Try again
            </button>
          </Overlay>
        )}
        {current && current.cells.length === 0 && (
          <Overlay subtle>
            <MapPinOff className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">No {label.toLowerCase()} yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              There is currently no available data for this category.
            </p>
          </Overlay>
        )}

        <div className="absolute bottom-3 left-3 z-[700] w-52 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold">Report density</p>
          <div className="mt-2 h-2 rounded-full" style={{ background: LEGEND_GRADIENT[category] }} aria-hidden />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Fewer</span>
            <span>More reports</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Darker areas show where more observations have been submitted, not necessarily where conditions are worse.
      </p>
    </div>
  )
}

function Overlay({ children, subtle }: { children: React.ReactNode; subtle?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[650] grid place-items-center p-6",
        subtle ? "bg-background/40" : "bg-background/70",
      )}
    >
      <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-5 py-4 text-center shadow-sm">
        {children}
      </div>
    </div>
  )
}

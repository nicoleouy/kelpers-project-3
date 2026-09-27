"use client"

import { Bookmark, Clock, MapPin, Navigation, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { VolunteerOpportunity } from "@/lib/types"

export function OpportunityCard({
  opp,
  onOpen,
}: {
  opp: VolunteerOpportunity
  onOpen?: () => void
}) {
  const { toggleRegister, toggleSave } = useStore()
  const full = opp.registeredCount >= opp.capacity
  const spotsLeft = Math.max(0, opp.capacity - opp.registeredCount)

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {onOpen ? (
            <button type="button" onClick={onOpen} className="text-left">
              <h3 className="font-display text-base font-semibold leading-tight">{opp.title}</h3>
              <p className="text-xs text-muted-foreground">{opp.organizationName}</p>
            </button>
          ) : (
            <>
              <h3 className="font-display text-base font-semibold leading-tight">{opp.title}</h3>
              <p className="text-xs text-muted-foreground">{opp.organizationName}</p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggleSave(opp.id)}
          aria-label={opp.savedByMe ? "Remove from saved" : "Save opportunity"}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
            opp.savedByMe ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
          )}
        >
          <Bookmark className={cn("size-4", opp.savedByMe && "fill-current")} />
        </button>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{opp.description}</p>

      <div className="grid gap-1.5 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-primary" />
          {opp.location}
          <span className="flex items-center gap-1 text-xs">
            <Navigation className="size-3" />
            {opp.distanceMiles} mi
          </span>
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4 shrink-0 text-primary" />
          {opp.date} · {opp.time} · {opp.duration}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4 shrink-0 text-primary" />
          {opp.registeredCount}/{opp.capacity} registered
          {spotsLeft > 0 && spotsLeft <= 8 && (
            <span className="text-xs font-medium text-crisis">{spotsLeft} spots left</span>
          )}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="font-normal">
          {opp.setting}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          {opp.skillLevel}
        </Badge>
        {opp.categories.map((c) => (
          <Badge key={c} variant="outline" className="font-normal">
            {c}
          </Badge>
        ))}
      </div>

      {opp.relatedReportId && (
        <p className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary">
          <MapPin className="size-3.5" />
          Related to issues reported nearby
        </p>
      )}

      <Button
        variant={opp.registeredByMe ? "secondary" : "default"}
        className="w-full"
        disabled={full && !opp.registeredByMe}
        onClick={() => toggleRegister(opp.id)}
      >
        {opp.registeredByMe ? "You're registered" : full ? "Full" : "Register"}
      </Button>
    </article>
  )
}

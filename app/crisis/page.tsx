"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Check, Loader2, Phone, Radio, ShieldAlert } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import { IncidentCard } from "@/components/incident-card"
import { IncidentDetail } from "@/components/incident-detail"
import { ReportDetail } from "@/components/report-detail"
import { DetailPanel } from "@/components/detail-panel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { categoryMeta } from "@/lib/categories"
import { CURRENT_USER } from "@/lib/mock-data"
import type { CategoryId } from "@/lib/types"

const CRISIS_CATEGORIES: CategoryId[] = [
  "smoke-fire",
  "flooding",
  "chemical",
  "storm-damage",
  "natural-disaster",
  "injured-wildlife",
]

const EMERGENCY_CONTACTS = [
  { label: "Life-threatening emergency", value: "911", note: "Fire, medical, immediate danger" },
  { label: "EPA environmental hotline", value: "1-800-424-8802", note: "Spills & chemical releases" },
  { label: "Wildlife rescue", value: "1-800-241-4113", note: "Injured or distressed animals" },
]

const SAFETY_TIPS = [
  { title: "Stay upwind & uphill", body: "Move away from smoke, floodwater, and chemical sources. Do not drive through flooded roads." },
  { title: "Protect your air", body: "Close windows during smoke events and use a mask or air filter if available." },
  { title: "Document from safety", body: "Only capture photos if it's safe. Your report helps responders understand the situation." },
]

export default function CrisisPage() {
  const { incidents, reports, submitReport } = useStore()
  const [category, setCategory] = useState<CategoryId>("smoke-fire")
  const [description, setDescription] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selected, setSelected] = useState<{ kind: "report" | "incident"; id: string } | null>(null)

  const activeCrises = useMemo(
    () => incidents.filter((i) => i.severity === "high" || i.severity === "severe"),
    [incidents],
  )

  const selectedReport = selected?.kind === "report" ? reports.find((r) => r.id === selected.id) : undefined
  const selectedIncident = selected?.kind === "incident" ? incidents.find((i) => i.id === selected.id) : undefined

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    const result = await submitReport({
      category,
      tags: ["crisis"],
      description: description.trim() || `Urgent ${categoryMeta(category).label.toLowerCase()} reported`,
      latitude: CURRENT_USER.lat + (Math.random() - 0.5) * 0.03,
      longitude: CURRENT_USER.lng + (Math.random() - 0.5) * 0.03,
      approximateLocation: `Near ${CURRENT_USER.location}`,
      severity: "severe",
      isCrisis: true,
    })
    setSubmitting(false)
    if (!result.ok) {
      setSubmitError(result.error)
      return
    }
    setSubmitted(true)
    setDescription("")
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl border border-crisis/30 bg-crisis/5 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-crisis text-crisis-foreground">
            <ShieldAlert className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold text-crisis">Crisis mode</h1>
            <p className="mt-1 max-w-2xl text-pretty text-sm text-foreground/80">
              For life-threatening emergencies, always call 911 first. Use this space to quickly report urgent
              environmental crises and coordinate community response.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {EMERGENCY_CONTACTS.map((c) => (
            <a
              key={c.value}
              href={`tel:${c.value.replace(/[^0-9]/g, "")}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-transform hover:scale-[1.02]"
            >
              <span className="grid size-10 place-items-center rounded-full bg-crisis/10 text-crisis">
                <Phone className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{c.value}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.label}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Active crises */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
          <AlertTriangle className="size-5 text-crisis" />
          Active crises near you
        </h2>
        {activeCrises.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {activeCrises.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} onOpen={() => setSelected({ kind: "incident", id: inc.id })} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No active crises reported nearby right now.
          </p>
        )}
      </section>

      {/* Quick report + safety */}
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Report an urgent crisis</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            A fast path for emergencies. This is flagged as severe and prioritized for response.
          </p>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary/5 p-6 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
                <Check className="size-6" />
              </span>
              <p className="font-semibold">Crisis report submitted</p>
              <p className="text-sm text-muted-foreground">
                Your report is now visible to the community and responding organizations.
              </p>
              <Button variant="secondary" onClick={() => setSubmitted(false)}>
                Report another
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {CRISIS_CATEGORIES.map((c) => {
                  const meta = categoryMeta(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center text-xs font-medium transition-all",
                        category === c ? "border-crisis bg-crisis/5 shadow-sm" : "border-border hover:bg-secondary/60",
                      )}
                    >
                      <span className="grid size-9 place-items-center rounded-xl text-white" style={{ backgroundColor: meta.color }}>
                        <CategoryIcon name={meta.icon} className="size-4" />
                      </span>
                      {meta.label}
                    </button>
                  )
                })}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the situation and any immediate dangers..."
                className="mt-4 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-crisis/40"
              />
              {submitError && (
                <p role="alert" className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {submitError} Your report was not saved.
                </p>
              )}
              <Button
                onClick={submit}
                disabled={submitting}
                aria-busy={submitting}
                className="mt-4 w-full bg-crisis text-crisis-foreground hover:bg-crisis/90"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
                {submitting ? "Verifying & saving…" : "Submit crisis report"}
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-lg font-semibold">Stay safe</h3>
          {SAFETY_TIPS.map((t) => (
            <div key={t.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <DetailPanel
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selectedIncident ? "Incident" : "Report"}
      >
        {selectedReport && (
          <ReportDetail report={selectedReport} onOpenIncident={(id) => setSelected({ kind: "incident", id })} />
        )}
        {selectedIncident && (
          <IncidentDetail incident={selectedIncident} onOpenReport={(id) => setSelected({ kind: "report", id })} />
        )}
      </DetailPanel>
    </div>
  )
}

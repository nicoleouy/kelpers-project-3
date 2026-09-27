"use client"

import { useState, type FormEvent } from "react"
import { CalendarPlus, Check, Clock, IdCard, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EventDetails {
  title: string
  date: string
  time: string
  location: string
  capacity: number
  description: string
}

export interface IdVerificationInput {
  legalName: string
  idType: string
  idDocument: File
}

export interface PlannedEvent extends EventDetails {
  id: string
  verificationStatus: "pending"
}

const ID_TYPES = ["Driver's licence", "Passport", "National ID card", "Provincial / state ID"]

const EMPTY_DETAILS: EventDetails = { title: "", date: "", time: "", location: "", capacity: 20, description: "" }

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
const labelClass = "flex flex-col gap-1.5 text-sm font-medium"

type Step = "details" | "verify" | "submitted"

export function PlanEventCard({
  onSubmit,
}: {
  onSubmit?: (details: EventDetails, verification: IdVerificationInput) => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("details")
  const [details, setDetails] = useState<EventDetails>(EMPTY_DETAILS)
  const [legalName, setLegalName] = useState("")
  const [idType, setIdType] = useState(ID_TYPES[0])
  const [idDocument, setIdDocument] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [planned, setPlanned] = useState<PlannedEvent[]>([])

  const update = <K extends keyof EventDetails>(key: K, value: EventDetails[K]) =>
    setDetails((d) => ({ ...d, [key]: value }))

  const detailsValid =
    details.title.trim() && details.date && details.time && details.location.trim() && details.capacity > 0
  const verifyValid = legalName.trim() && idDocument && consent

  const reset = () => {
    setDetails(EMPTY_DETAILS)
    setLegalName("")
    setIdType(ID_TYPES[0])
    setIdDocument(null)
    setConsent(false)
    setStep("details")
  }

  const submitDetails = (e: FormEvent) => {
    e.preventDefault()
    if (detailsValid) setStep("verify")
  }

  const submitVerification = async (e: FormEvent) => {
    e.preventDefault()
    if (!verifyValid || !idDocument) return
    setSubmitting(true)
    try {
      await onSubmit?.(details, { legalName: legalName.trim(), idType, idDocument })
      setPlanned((p) => [{ ...details, id: crypto.randomUUID(), verificationStatus: "pending" }, ...p])
      setStep("submitted")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <aside aria-labelledby="plan-event-heading" className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <CalendarPlus className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="plan-event-heading" className="font-display text-lg font-semibold">
            Plan an event
          </h2>
          <p className="text-xs text-muted-foreground">Organise a cleanup, planting, or community action.</p>
        </div>
      </div>

      {!open ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Organisers are asked for basic event details and must verify their identity before an event is published.
          </p>
          <Button onClick={() => setOpen(true)} className="w-full">
            Start planning
          </Button>
        </div>
      ) : (
        <>
          <ol className="mt-5 flex items-center gap-2 text-xs font-medium" aria-label="Progress">
            {(
              [
                { id: "details", label: "Details" },
                { id: "verify", label: "ID verification" },
              ] as const
            ).map((s, i) => {
              const done = step === "submitted" || (s.id === "details" && step === "verify")
              const current = step === s.id
              return (
                <li key={s.id} className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
                  {i > 0 && <span className="h-px w-5 bg-border" aria-hidden />}
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[10px]",
                      done || current ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3" aria-hidden /> : i + 1}
                  </span>
                  <span className={current ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                </li>
              )
            })}
          </ol>

          {step === "details" && (
            <form onSubmit={submitDetails} className="mt-4 flex flex-col gap-3">
              <label className={labelClass}>
                Event name
                <input
                  required
                  value={details.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g. Shoreline cleanup"
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Date
                  <input
                    required
                    type="date"
                    value={details.date}
                    onChange={(e) => update("date", e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Start time
                  <input
                    required
                    type="time"
                    value={details.time}
                    onChange={(e) => update("time", e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className={labelClass}>
                Location
                <input
                  required
                  value={details.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Park, beach, or meeting point"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Volunteer capacity
                <input
                  required
                  type="number"
                  min={1}
                  value={details.capacity}
                  onChange={(e) => update("capacity", Number(e.target.value))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Description
                <textarea
                  rows={3}
                  value={details.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="What will volunteers do? What should they bring?"
                  className={cn(inputClass, "resize-none")}
                />
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={!detailsValid} className="flex-1">
                  Continue
                </Button>
              </div>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={submitVerification} className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
                <p>
                  To keep events safe, organisers must verify their identity. Your event will stay unpublished until
                  verification is approved.
                </p>
              </div>
              <label className={labelClass}>
                Full legal name
                <input
                  required
                  autoComplete="name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                ID type
                <select value={idType} onChange={(e) => setIdType(e.target.value)} className={inputClass}>
                  {ID_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Photo of your ID
                <span className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-3 text-sm font-normal text-muted-foreground">
                  <IdCard className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{idDocument ? idDocument.name : "Choose an image or PDF"}</span>
                </span>
                <input
                  required
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                I confirm this ID belongs to me and consent to it being used to verify my identity as an organiser.
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("details")} className="flex-1">
                  Back
                </Button>
                <Button type="submit" disabled={!verifyValid || submitting} className="flex-1">
                  {submitting ? "Submitting..." : "Submit for verification"}
                </Button>
              </div>
            </form>
          )}

          {step === "submitted" && (
            <div className="mt-4 flex flex-col gap-3" role="status">
              <div className="rounded-xl bg-primary/10 p-4 text-sm">
                <p className="font-semibold text-primary">Event submitted</p>
                <p className="mt-1 text-muted-foreground">
                  Your event is awaiting ID verification and will be published once approved.
                </p>
              </div>
              <Button variant="outline" onClick={reset} className="w-full">
                Plan another event
              </Button>
            </div>
          )}
        </>
      )}

      {planned.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your planned events</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {planned.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold leading-tight">{ev.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ev.date} · {ev.time} · {ev.location}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#ca8a04]/12 px-2 py-0.5 text-[11px] font-medium text-[#a16207]">
                  <Clock className="size-3" aria-hidden />
                  Pending ID verification
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}

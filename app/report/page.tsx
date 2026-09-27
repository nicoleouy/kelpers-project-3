"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ImageIcon,
  Loader2,
  Locate,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import { SeverityBadge } from "@/components/severity-badge"
import { ListenButton } from "@/components/listen-button"
import { VerificationPanel } from "@/components/verification-status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { CATEGORIES, CATEGORY_GROUPS, SEVERITY_META, SEVERITY_ORDER, categoryMeta } from "@/lib/categories"
import { CURRENT_USER } from "@/lib/mock-data"
import { tagSuggestions } from "@/lib/tags"
import type { CategoryId, Report, Severity } from "@/lib/types"

const SAMPLE_IMAGES = [
  "/reports/litter.png",
  "/reports/smoke.png",
  "/reports/water.png",
  "/reports/wildlife.png",
  "/reports/flooding.png",
  "/reports/tree.png",
]

const STEPS = ["Photo", "Category", "Details", "Location", "Review"]

type LocationState = {
  label: string
  lat: number
  lng: number
  source: "current" | "manual" | null
}

export default function ReportPage() {
  const router = useRouter()
  const { submitReport, runVerification, verifications } = useStore()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [image, setImage] = useState<string | undefined>()
  const [group, setGroup] = useState<string>(CATEGORY_GROUPS[0])
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [description, setDescription] = useState("")
  const [severity, setSeverity] = useState<Severity>("moderate")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [location, setLocation] = useState<LocationState>({ label: "", lat: 0, lng: 0, source: null })
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualText, setManualText] = useState("")
  const [submitted, setSubmitted] = useState<Report | null>(null)

  const hasLocation = location.source !== null && location.label.trim().length > 0

  const canNext =
    step === 0 ||
    (step === 1 && category !== null) ||
    (step === 2 && description.trim().length > 0) ||
    (step === 3 && hasLocation) ||
    step === 4

  const suggestions = useMemo(
    () => tagSuggestions(category, tagInput, tags),
    [category, tagInput, tags],
  )

  const addTag = (value?: string) => {
    const t = (value ?? tagInput).trim()
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTags((prev) => [...prev, t])
    }
    setTagInput("")
  }

  const useCurrentLocation = () => {
    setLocationError(null)
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation isn't available in this browser. Enter a location instead.")
      setManualEntry(true)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLocation({
          label: `Near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
          lat: latitude,
          lng: longitude,
          source: "current",
        })
        setManualEntry(false)
        setLocating(false)
      },
      () => {
        setLocating(false)
        setLocationError("We couldn't get your location. You can enter it manually instead.")
        setManualEntry(true)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const applyManualLocation = () => {
    const text = manualText.trim()
    if (!text) return
    // No geocoding service available: keep the typed text as the approximate
    // location and derive stable coordinates near the user's area (jittered from
    // the text) so the marker lands somewhere sensible without a backend.
    let hash = 0
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
    const jitterLat = ((hash % 200) / 200 - 0.5) * 0.08
    const jitterLng = (((hash >> 8) % 200) / 200 - 0.5) * 0.08
    setLocation({
      label: text,
      lat: CURRENT_USER.lat + jitterLat,
      lng: CURRENT_USER.lng + jitterLng,
      source: "manual",
    })
  }

  const submit = async () => {
    if (!category || !hasLocation || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    const result = await submitReport({
      category,
      tags,
      description: description.trim(),
      image,
      latitude: location.lat,
      longitude: location.lng,
      approximateLocation: location.label,
      severity,
    })
    setSubmitting(false)
    if (result.ok) setSubmitted(result.report)
    else setSubmitError(result.error)
  }

  if (submitted) {
    const meta = categoryMeta(submitted.category)
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary/15 text-primary">
          <Check className="size-8" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold">Report submitted</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for contributing to your community&apos;s environmental picture.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl text-white" style={{ backgroundColor: meta.color }}>
              <CategoryIcon name={meta.icon} className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{meta.label}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {submitted.approximateLocation}
              </p>
            </div>
            <div className="ml-auto">
              <SeverityBadge severity={submitted.severity} />
            </div>
          </div>

          {submitted.incidentId ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-primary/5 p-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-primary">Grouped with a likely incident</p>
                <p className="text-xs text-muted-foreground">
                  Our system detected other nearby reports that appear related. Your report was added to help verify a
                  developing incident.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-secondary/60 p-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                We&apos;ll watch for related reports nearby. If others report something similar, we&apos;ll group them
                into an incident automatically.
              </p>
            </div>
          )}

          <div className="mt-4">
            <VerificationPanel
              verification={verifications[submitted.id]}
              onRun={() => runVerification(submitted)}
            />
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <ListenButton
              size="sm"
              label="Listen to confirmation"
              text={
                submitted.incidentId
                  ? `Your ${meta.label} report near ${submitted.approximateLocation} was submitted and grouped with a likely related incident. Thank you for helping verify a developing situation.`
                  : `Your ${meta.label} report near ${submitted.approximateLocation} was submitted successfully. We'll watch for related reports nearby.`
              }
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() =>
              router.push(
                submitted.incidentId
                  ? `/map?focus=incident:${submitted.incidentId}`
                  : `/map?focus=report:${submitted.id}`,
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            View on the map
            <ArrowRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSubmitted(null)
              setStep(0)
              setImage(undefined)
              setCategory(null)
              setDescription("")
              setTags([])
              setSeverity("moderate")
            }}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold"
          >
            Report something else
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">Report an observation</h1>
      <p className="text-sm text-muted-foreground">Share what you&apos;re seeing to help your community.</p>

      {/* Progress */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col gap-1.5">
            <span
              className={cn(
                "h-1.5 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-border",
              )}
            />
            <span className={cn("text-[11px] font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold">Add a photo</h2>
            <p className="mb-4 text-sm text-muted-foreground">A photo helps others understand and verify. Optional.</p>
            {image ? (
              <div className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image || "/placeholder.svg"} alt="Selected" className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
                  className="absolute right-3 top-3 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium shadow"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary">
                <Camera className="size-8" />
                <span className="text-sm font-medium">Take or upload a photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={() => setImage(SAMPLE_IMAGES[0])} />
              </label>
            )}
            <p className="mb-2 mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ImageIcon className="size-3.5" /> Or pick a sample
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {SAMPLE_IMAGES.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImage(src)}
                  className={cn(
                    "aspect-square overflow-hidden rounded-xl border-2 transition-colors",
                    image === src ? "border-primary" : "border-transparent",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src || "/placeholder.svg"} alt="Sample" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-semibold">What are you reporting?</h2>
            <p className="mb-4 text-sm text-muted-foreground">Pick the category that fits best.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {CATEGORY_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    group === g ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.filter((c) => c.group === group).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-sm font-medium transition-all",
                    category === c.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:bg-secondary/60",
                  )}
                >
                  <span className="grid size-10 place-items-center rounded-xl text-white" style={{ backgroundColor: c.color }}>
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-xl font-semibold">Describe what you see</h2>
              <p className="mb-3 text-sm text-muted-foreground">A short description helps others understand.</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="e.g. Thick smoke drifting from the northwest, strong burning smell..."
                className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Severity</label>
              <div className="grid grid-cols-4 gap-2">
                {SEVERITY_ORDER.map((s) => {
                  const meta = SEVERITY_META[s]
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all",
                        severity === s ? "border-transparent text-white shadow-sm" : "border-border bg-card",
                      )}
                      style={severity === s ? { backgroundColor: meta.color } : undefined}
                    >
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Tags</label>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button type="button" variant="secondary" onClick={() => addTag()}>
                  Add
                </Button>
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Suggested{category ? ` for ${categoryMeta(category).label}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTag(s)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <Plus className="size-3" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <button key={t} type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                      <Badge variant="secondary" className="font-normal">
                        {t} ×
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-xl font-semibold">Where is this?</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              We only ever share an approximate location to protect your privacy.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                  location.source === "current"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:bg-secondary/60",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  {locating ? <Loader2 className="size-5 animate-spin" /> : <Locate className="size-5" />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">
                    {locating ? "Getting your location…" : "Use my current location"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {location.source === "current" ? location.label : "Uses your device's GPS. We only store an approximate point."}
                  </span>
                </span>
                {location.source === "current" && <Check className="size-4 shrink-0 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setManualEntry(true)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                  location.source === "manual"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:bg-secondary/60",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                  <Pencil className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">Enter a location</span>
                  <span className="block text-xs text-muted-foreground">
                    {location.source === "manual" ? location.label : "Type an address, landmark, neighborhood, or place name."}
                  </span>
                </span>
                {location.source === "manual" && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            </div>

            {locationError && (
              <p className="mt-3 rounded-xl bg-crisis/10 px-3 py-2 text-xs text-crisis">{locationError}</p>
            )}

            {manualEntry && (
              <div className="mt-3 flex gap-2">
                <input
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      applyManualLocation()
                    }
                  }}
                  placeholder="e.g. Piedmont Park north entrance, Atlanta"
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button type="button" variant="secondary" onClick={applyManualLocation}>
                  Set
                </Button>
              </div>
            )}

            {hasLocation && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                <MapPin className="size-4 shrink-0 text-primary" />
                <span>
                  Selected: <span className="font-medium text-foreground">{location.label}</span>. Exact coordinates are
                  never shown publicly.
                </span>
              </div>
            )}
          </div>
        )}

        {step === 4 && category && (
          <div>
            <h2 className="font-display text-xl font-semibold">Review your report</h2>
            <p className="mb-4 text-sm text-muted-foreground">Make sure everything looks right before submitting.</p>
            <div className="flex flex-col gap-4">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image || "/placeholder.svg"} alt="Report" className="aspect-video w-full rounded-2xl object-cover" />
              )}
              <div className="flex items-center gap-3">
                <span
                  className="grid size-10 place-items-center rounded-xl text-white"
                  style={{ backgroundColor: categoryMeta(category).color }}
                >
                  <CategoryIcon name={categoryMeta(category).icon} className="size-5" />
                </span>
                <span className="font-semibold">{categoryMeta(category).label}</span>
                <div className="ml-auto">
                  <SeverityBadge severity={severity} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{description || "No description provided."}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 text-primary" />
                {location.label}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {submitError && step === STEPS.length - 1 && (
        <p role="alert" className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {submitError} Your report was not saved.
        </p>
      )}

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground disabled:opacity-40"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting} aria-busy={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {submitting ? "Verifying & saving…" : "Submit report"}
          </Button>
        )}
      </div>
    </div>
  )
}

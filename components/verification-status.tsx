"use client"

import { useState } from "react"
import { AlertTriangle, HelpCircle, Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Report } from "@/lib/types"
import type { VerificationResult, VerificationStatus as Status } from "@/lib/gemini/types"

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: VerificationResult }
  | { kind: "error"; message: string }

const STATUS_META: Record<
  Status,
  { label: string; Icon: typeof ShieldCheck; className: string; iconClass: string }
> = {
  verified: {
    label: "Verified observation",
    Icon: ShieldCheck,
    className: "border-primary/25 bg-primary/5",
    iconClass: "bg-primary/15 text-primary",
  },
  needs_review: {
    label: "Needs review",
    Icon: AlertTriangle,
    className: "border-amber-500/30 bg-amber-500/10",
    iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  insufficient_evidence: {
    label: "Insufficient evidence",
    Icon: HelpCircle,
    className: "border-border bg-secondary/60",
    iconClass: "bg-muted text-muted-foreground",
  },
}

const DISCLAIMER =
  "Automated quality check — it assesses whether the submitted evidence is consistent, not whether the event is objectively confirmed."

export function VerificationStatus({ report }: { report: Report }) {
  // If the datastore already has a verification result, show it directly.
  const [state, setState] = useState<State>(
    report.verification ? { kind: "done", result: report.verification } : { kind: "idle" },
  )

  async function runCheck() {
    setState({ kind: "loading" })
    try {
      const res = await fetch("/api/verify-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          category: report.category,
          description: report.description,
          imageUrl: report.image,
          latitude: report.latitude,
          longitude: report.longitude,
          reportedAt: report.createdAt,
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | { verification?: VerificationResult; error?: string }
        | null
      if (!res.ok || !data?.verification) {
        setState({
          kind: "error",
          message: data?.error ?? "We couldn't complete the quality check. Please try again.",
        })
        return
      }
      setState({ kind: "done", result: data.verification })
    } catch {
      setState({ kind: "error", message: "We couldn't reach the verification service. Please try again." })
    }
  }

  if (state.kind === "done") {
    const meta = STATUS_META[state.result.status]
    const { Icon } = meta
    return (
      <div className={cn("rounded-2xl border p-4", meta.className)}>
        <div className="flex items-center gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", meta.iconClass)}>
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{meta.label}</p>
            <p className="text-xs text-muted-foreground">Automated AI quality check</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {Math.round(state.result.qualityScore * 100)}%
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-pretty">{state.result.summary}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          {state.kind === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {state.kind === "loading" ? "Running quality check…" : "AI verification pending"}
          </p>
          <p className="text-xs text-muted-foreground">
            {state.kind === "loading"
              ? "Checking evidence consistency"
              : "Run an automated check on the submitted evidence"}
          </p>
        </div>
        {state.kind !== "loading" && (
          <button
            type="button"
            onClick={runCheck}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {state.kind === "error" ? <RefreshCw className="size-3.5" /> : null}
            {state.kind === "error" ? "Retry" : "Run check"}
          </button>
        )}
      </div>
      {state.kind === "error" && <p className="mt-3 text-sm text-destructive">{state.message}</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
    </div>
  )
}

"use client"

import { AlertTriangle, CircleCheck, CircleDashed, Loader2, RotateCw, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { VerificationState } from "@/lib/verification/client"
import type { VerificationStatus } from "@/lib/verification/types"

const STATUS_META: Record<
  VerificationStatus,
  { label: string; explanation: string; icon: typeof CircleCheck; className: string }
> = {
  verified: {
    label: "Verified observation",
    explanation: "Automated quality check: submitted evidence appears consistent with the report.",
    icon: CircleCheck,
    className: "bg-primary/10 text-primary",
  },
  needs_review: {
    label: "Needs review",
    explanation: "Automated quality check flagged something for a human moderator to look at.",
    icon: AlertTriangle,
    className: "bg-amber-500/15 text-amber-800",
  },
  insufficient_evidence: {
    label: "Insufficient evidence",
    explanation: "Automated quality check: not enough evidence (such as a clear photo) to pass automatically.",
    icon: CircleDashed,
    className: "bg-secondary text-muted-foreground",
  },
}

export function VerificationBadge({ verification, className }: { verification?: VerificationState; className?: string }) {
  if (!verification || verification.state === "error") return null
  if (verification.state === "pending") {
    return (
      <Badge variant="secondary" className={cn("whitespace-nowrap font-normal", className)}>
        <Loader2 className="size-3 animate-spin" />
        AI verification pending
      </Badge>
    )
  }
  const meta = STATUS_META[verification.result.status]
  const Icon = meta.icon
  return (
    <Badge className={cn("whitespace-nowrap font-medium", meta.className, className)}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  )
}

export function VerificationPanel({
  verification,
  onRun,
}: {
  verification?: VerificationState
  onRun: () => void
}) {
  return (
    <section aria-live="polite" className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-primary" />
        Automated quality check
      </p>

      {!verification && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            This report hasn&apos;t been checked yet. The check compares the photo, category, and description for
            consistency.
          </p>
          <Button size="sm" variant="secondary" onClick={onRun}>
            Run quality check
          </Button>
        </>
      )}

      {verification?.state === "pending" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          AI verification pending
        </p>
      )}

      {verification?.state === "error" && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {verification.message} Your report is unchanged.
          </p>
          {verification.retryable && (
            <Button size="sm" variant="secondary" onClick={onRun}>
              <RotateCw className="size-3.5" />
              Retry check
            </Button>
          )}
        </>
      )}

      {verification?.state === "done" && (
        <div className="flex flex-col gap-2">
          <VerificationBadge verification={verification} className="self-start" />
          <p className="text-xs text-muted-foreground">{STATUS_META[verification.result.status].explanation}</p>
          <p className="text-sm text-pretty">{verification.result.summary}</p>
        </div>
      )}

      <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
        This is an automated consistency check of the submitted evidence, not proof that an environmental event is
        objectively true.
      </p>
    </section>
  )
}

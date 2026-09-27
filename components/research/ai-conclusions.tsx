"use client"

import useSWR from "swr"
import { ArrowRight, BrainCircuit, FlaskConical, Loader2, RefreshCw, Sparkles, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Insight } from "@/lib/intelligence/schema"
import type { ConclusionsResponse } from "@/lib/intelligence/types"

const PIPELINE = ["Tiger Data", "Grok", "AI analysis", "Conclusions"]
const CACHED_URL = "/api/intelligence?cached=1"

const CONFIDENCE_STYLE: Record<Insight["confidence"], string> = {
  high: "bg-primary/12 text-primary",
  medium: "bg-[#ca8a04]/12 text-[#a16207]",
  low: "bg-muted text-muted-foreground",
}

async function readJson(res: Response): Promise<ConclusionsResponse> {
  const body = (await res.json().catch(() => null)) as ConclusionsResponse | null
  return body ?? { status: "error", error: "Unexpected response from the analysis service." }
}

const fetchCached = (url: string) => fetch(url).then(readJson)
const runAnalysis = () => fetch("/api/intelligence", { method: "POST" }).then(readJson)

export function AiConclusionsSection() {
  const { data, isLoading, isValidating, mutate } = useSWR(CACHED_URL, fetchCached, {
    revalidateOnFocus: false,
  })
  const analyzing = isValidating && !isLoading
  const run = () => mutate(runAnalysis(), { revalidate: false })

  const ok = data?.status === "ok" ? data : null
  const reportCount = data && "profile" in data ? data.profile?.observationCount : undefined
  const canRun = data?.status === "idle" || data?.status === "ok" || data?.status === "error"

  return (
    <section
      aria-labelledby="ai-conclusions-heading"
      aria-busy={analyzing}
      className="min-w-0 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BrainCircuit className="size-5 shrink-0 text-[#0369a1]" aria-hidden />
            <h2 id="ai-conclusions-heading" className="font-display text-lg font-semibold">
              AI research conclusions
            </h2>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Grok
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Final conclusions drawn by AI from the full community dataset.
          </p>
          {ok && (
            <p className="mt-1 text-xs text-muted-foreground">
              {ok.profile.observationCount.toLocaleString()} reports analyzed · Updated{" "}
              {new Date(ok.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        {canRun && (
          <Button size="sm" variant={ok ? "secondary" : "default"} onClick={run} disabled={analyzing}>
            {analyzing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : ok ? (
              <RefreshCw className="size-4" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {analyzing ? "Analyzing..." : ok ? "Refresh analysis" : "Run analysis"}
          </Button>
        )}
      </header>

      {isLoading || analyzing ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          {analyzing ? "Reading Tiger Data reports and running Grok analysis..." : "Loading..."}
        </div>
      ) : ok ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="rounded-2xl bg-[#0369a1]/8 p-4">
            <p className="text-pretty font-display text-base font-semibold">{ok.analysis.headline}</p>
            <p className="mt-1 text-pretty text-sm text-muted-foreground">{ok.analysis.overview}</p>
          </div>

          {ok.analysis.insights.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {ok.analysis.insights.map((insight) => (
                <li key={insight.title} className="min-w-0 rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 text-pretty text-sm font-semibold">{insight.title}</h3>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        CONFIDENCE_STYLE[insight.confidence],
                      )}
                    >
                      {insight.confidence}
                    </span>
                  </div>
                  <p className="mt-1.5 text-pretty text-sm text-muted-foreground">{insight.finding}</p>
                  {insight.evidence.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
                      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-xs text-muted-foreground">
                        {insight.evidence.map((e) => (
                          <li key={e} className="break-words">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {ok.analysis.researchQuestions.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <FlaskConical className="size-4 text-[#0369a1]" aria-hidden />
                Open research questions
              </h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {ok.analysis.researchQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {ok.analysis.dataLimitations.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <TriangleAlert className="size-4 text-[#a16207]" aria-hidden />
                Limitations
              </h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {ok.analysis.dataLimitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <p className="font-medium">
            {data?.status === "error" ? "Analysis unavailable" : "No conclusions yet"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-pretty text-sm text-muted-foreground" role={data?.status === "error" ? "alert" : undefined}>
            {data?.status === "error"
              ? data.error
              : data?.status === "insufficient-data"
                ? `Grok needs at least ${data.minimumObservations} reports to find reliable patterns. Tiger Data currently has ${data.profile.observationCount}.`
                : data?.status === "idle"
                  ? `${reportCount?.toLocaleString() ?? "Stored"} reports are ready. Run the analysis to generate conclusions.`
                  : "AI-generated research conclusions will appear here once the analysis has run."}
          </p>
          <ol className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs" aria-label="Analysis pipeline">
            {PIPELINE.map((stage, i) => (
              <li key={stage} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="size-3 text-muted-foreground" aria-hidden />}
                <span className="whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 font-medium">{stage}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

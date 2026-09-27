import { ArrowRight, BrainCircuit, FlaskConical, Loader2, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { GrokAnalysis } from "@/lib/intelligence/schema"

export type AiConclusions = Pick<GrokAnalysis, "headline" | "overview" | "researchQuestions" | "dataLimitations"> & {
  generatedAt: string
  model: string
}

const PIPELINE = ["Tiger Data", "Grok", "AI analysis", "Conclusions"]

export function AiConclusionsSection({
  conclusions,
  isLoading = false,
}: {
  conclusions?: AiConclusions | null
  isLoading?: boolean
}) {
  return (
    <section aria-labelledby="ai-conclusions-heading" className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-[#0369a1]" aria-hidden />
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
        </div>
        {conclusions && (
          <p className="text-xs text-muted-foreground">
            {conclusions.model} · {new Date(conclusions.generatedAt).toLocaleString()}
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Generating conclusions...
        </div>
      ) : conclusions ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="rounded-2xl bg-[#0369a1]/8 p-4">
            <p className="font-display text-base font-semibold">{conclusions.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">{conclusions.overview}</p>
          </div>
          {conclusions.researchQuestions.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <FlaskConical className="size-4 text-[#0369a1]" aria-hidden />
                Open research questions
              </h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {conclusions.researchQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {conclusions.dataLimitations.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <TriangleAlert className="size-4 text-[#a16207]" aria-hidden />
                Limitations
              </h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {conclusions.dataLimitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <p className="font-medium">No conclusions yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            AI-generated research conclusions will appear here once the Grok analysis of Tiger Data reports is connected.
          </p>
          <ol className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs" aria-label="Analysis pipeline">
            {PIPELINE.map((stage, i) => (
              <li key={stage} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="size-3 text-muted-foreground" aria-hidden />}
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">{stage}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

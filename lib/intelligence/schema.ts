import { z } from "zod"

export const DIMENSIONS = ["geographic", "temporal", "category", "intervention", "cross-cutting"] as const
export const AUDIENCES = ["community", "nonprofits", "researchers", "infrastructure"] as const

export const insightSchema = z.object({
  dimension: z.enum(DIMENSIONS),
  kind: z
    .enum([
      "hotspot",
      "persistent-problem",
      "emerging-trend",
      "seasonal-pattern",
      "co-occurrence",
      "coverage-gap",
      "neighbor-contrast",
      "intervention-signal",
      "resource-gap",
      "anomaly",
    ])
    .describe("The type of pattern this insight describes."),
  title: z.string().describe("Short, specific headline (under 90 characters)."),
  finding: z.string().describe("What the aggregate data shows, in 1-3 plain-language sentences."),
  evidence: z
    .array(z.string())
    .describe("Concrete numbers from the provided aggregates that support the finding. Cite cell ids or months."),
  whyItMatters: z.string().describe("Why an individual reporter or single organization would not see this."),
  confidence: z.enum(["low", "medium", "high"]),
  audiences: z.array(z.enum(AUDIENCES)).describe("Who should act on or study this."),
  suggestedActions: z.array(z.string()).describe("Specific next steps: investigate, monitor, allocate, or study."),
  areas: z.array(z.string()).describe("Approximate area names or cell ids involved. Never exact addresses."),
})

export const grokAnalysisSchema = z.object({
  headline: z.string().describe("The single most important thing the aggregate dataset reveals."),
  overview: z.string().describe("2-4 sentence synthesis across dimensions. Not a summary of counts."),
  insights: z.array(insightSchema).describe("Ranked most-actionable first. 3-10 items when data allows."),
  earlyWarnings: z
    .array(
      z.object({
        signal: z.string(),
        area: z.string(),
        watchFor: z.string().describe("What change would confirm this is becoming a crisis."),
      }),
    )
    .describe("Conditions that may become crises if they continue. Empty if none are supported."),
  researchQuestions: z.array(z.string()).describe("Testable questions a researcher could pursue with this data."),
  dataLimitations: z.array(z.string()).describe("Caveats: reporting bias, sparse areas, short history, missing fields."),
})

export type GrokAnalysis = z.infer<typeof grokAnalysisSchema>
export type Insight = z.infer<typeof insightSchema>

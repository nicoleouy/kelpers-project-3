import "server-only"

import { GoogleGenAI, Type } from "@google/genai"
import type {
  ReportForVerification,
  VerificationErrorCode,
  VerificationResult,
  VerificationStatus,
} from "./types"

export type { ReportForVerification, VerificationResult, VerificationStatus } from "./types"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Vision + structured-output capable, fast and inexpensive — a good default for
// an automated quality check.
const MODEL = "gemini-2.5-flash"

// Guardrails so this service can't be turned into an unbounded proxy / cost sink.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB
const MAX_RELATED_REPORTS = 20
const IMAGE_FETCH_TIMEOUT_MS = 10_000

/** Typed error so the API route can translate failures into safe HTTP responses. */
export class VerificationError extends Error {
  code: VerificationErrorCode
  constructor(code: VerificationErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = "VerificationError"
  }
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `You are an automated QUALITY-CONTROL assistant for a crowdsourced environmental reporting platform.

Your ONLY job is to assess whether a submitted report's evidence is internally consistent and suitable for inclusion in a community environmental dataset.

You MUST NOT:
- decide whether an environmental event is objectively "real" or "fake"
- accuse the reporter of lying
- draw scientific conclusions
- infer anything that is not visible in the submitted evidence
- make unsupported claims about the reporter

Evaluate only:
1. Whether the image (if any) appears consistent with the selected category.
2. Whether the image (if any) appears consistent with the description.
3. Whether the report appears to duplicate any of the provided nearby/recent reports.
4. Whether there is enough evidence for an automated quality check to pass.
5. Whether there are obvious internal inconsistencies that should flag the report for human review.

Choose exactly one status:
- "verified": evidence is present and internally consistent.
- "needs_review": there is a notable inconsistency, a possible duplicate, or ambiguity a human should check.
- "insufficient_evidence": there is not enough evidence (e.g. no image and a vague description) to make an assessment.

Keep the summary neutral, factual, and at most two sentences. Never use the words "real" or "fake".`

// ---------------------------------------------------------------------------
// Structured output schema
// ---------------------------------------------------------------------------

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    category_match: { type: Type.BOOLEAN },
    image_supports_claim: { type: Type.BOOLEAN },
    possible_duplicate: { type: Type.BOOLEAN },
    quality_score: { type: Type.NUMBER },
    status: {
      type: Type.STRING,
      enum: ["verified", "needs_review", "insufficient_evidence"],
    },
    summary: { type: Type.STRING },
  },
  required: [
    "category_match",
    "image_supports_claim",
    "possible_duplicate",
    "quality_score",
    "status",
    "summary",
  ],
  propertyOrdering: [
    "category_match",
    "image_supports_claim",
    "possible_duplicate",
    "quality_score",
    "status",
    "summary",
  ],
}

// ---------------------------------------------------------------------------
// Image handling
// ---------------------------------------------------------------------------

type InlineImage = { mimeType: string; data: string }

/**
 * Turn an image reference into inline base64 data Gemini can read. Supports data
 * URLs and absolute http(s) URLs. Site-relative paths are NOT resolved here —
 * the API route converts them to absolute URLs first. Returns null when there is
 * no usable image; throws only when a provided image genuinely fails to load.
 */
async function loadInlineImage(imageUrl: string | undefined): Promise<InlineImage | null> {
  if (!imageUrl) return null

  // data:[<mime>][;base64],<data>
  if (imageUrl.startsWith("data:")) {
    const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(imageUrl)
    if (!match) throw new VerificationError("image_fetch_failed", "Malformed data URL.")
    const mimeType = match[1] || "image/png"
    const isBase64 = Boolean(match[2])
    const raw = match[3] ?? ""
    const data = isBase64 ? raw : Buffer.from(decodeURIComponent(raw)).toString("base64")
    if (!mimeType.startsWith("image/")) {
      throw new VerificationError("image_fetch_failed", "Data URL is not an image.")
    }
    return { mimeType, data }
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    // Not something we can fetch (e.g. an unresolved relative path). Treat as
    // "no image" rather than failing the whole verification.
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(imageUrl, { signal: controller.signal })
    if (!res.ok) {
      throw new VerificationError("image_fetch_failed", `Image request failed (${res.status}).`)
    }
    const contentType = res.headers.get("content-type") ?? "application/octet-stream"
    if (!contentType.startsWith("image/")) {
      throw new VerificationError("image_fetch_failed", "Fetched resource is not an image.")
    }
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new VerificationError("image_fetch_failed", "Image exceeds the size limit.")
    }
    return { mimeType: contentType.split(";")[0], data: Buffer.from(bytes).toString("base64") }
  } catch (err) {
    if (err instanceof VerificationError) throw err
    throw new VerificationError("image_fetch_failed", "Could not load the report image.")
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

function describeReport(report: ReportForVerification): string {
  const lines = [
    `- category: ${report.category}`,
    report.description ? `- description: ${report.description}` : "- description: (none provided)",
  ]
  if (typeof report.latitude === "number" && typeof report.longitude === "number") {
    lines.push(`- location: ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`)
  }
  if (report.reportedAt) lines.push(`- reportedAt: ${report.reportedAt}`)
  lines.push(`- imageProvided: ${report.imageUrl ? "yes" : "no"}`)
  return lines.join("\n")
}

function buildPrompt(report: ReportForVerification, relatedReports: ReportForVerification[], hasImage: boolean): string {
  const sections: string[] = []
  sections.push("NEW REPORT UNDER REVIEW:\n" + describeReport(report))

  if (hasImage) {
    sections.push("The submitted image for the new report is attached below.")
  } else {
    sections.push("No image was submitted with the new report.")
  }

  if (relatedReports.length > 0) {
    const related = relatedReports
      .slice(0, MAX_RELATED_REPORTS)
      .map((r, i) => {
        const parts = [`  #${i + 1} category: ${r.category}`]
        if (r.description) parts.push(`     description: ${r.description}`)
        if (typeof r.latitude === "number" && typeof r.longitude === "number") {
          parts.push(`     location: ${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`)
        }
        if (r.reportedAt) parts.push(`     reportedAt: ${r.reportedAt}`)
        return parts.join("\n")
      })
      .join("\n")
    sections.push(
      "NEARBY / RECENT REPORTS (for duplicate detection only — do not evaluate their quality):\n" + related,
    )
  } else {
    sections.push("No nearby/recent reports were provided for duplicate comparison.")
  }

  sections.push(
    "Assess the new report per your instructions and respond with the required JSON object only.",
  )
  return sections.join("\n\n")
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

const STATUSES: readonly VerificationStatus[] = ["verified", "needs_review", "insufficient_evidence"]

function parseAndValidate(rawText: string | undefined): VerificationResult {
  if (!rawText) {
    throw new VerificationError("invalid_model_output", "Model returned an empty response.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new VerificationError("invalid_model_output", "Model response was not valid JSON.")
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new VerificationError("invalid_model_output", "Model response was not an object.")
  }

  const obj = parsed as Record<string, unknown>

  const categoryMatch = obj.category_match
  const imageSupportsClaim = obj.image_supports_claim
  const possibleDuplicate = obj.possible_duplicate
  const qualityScore = obj.quality_score
  const status = obj.status
  const summary = obj.summary

  if (
    typeof categoryMatch !== "boolean" ||
    typeof imageSupportsClaim !== "boolean" ||
    typeof possibleDuplicate !== "boolean" ||
    typeof qualityScore !== "number" ||
    !Number.isFinite(qualityScore) ||
    typeof status !== "string" ||
    !STATUSES.includes(status as VerificationStatus) ||
    typeof summary !== "string" ||
    summary.trim().length === 0
  ) {
    throw new VerificationError("invalid_model_output", "Model response did not match the expected schema.")
  }

  return {
    categoryMatch,
    imageSupportsClaim,
    possibleDuplicate,
    // Clamp to a sane 0..1 range regardless of what the model emits.
    qualityScore: Math.min(1, Math.max(0, qualityScore)),
    status: status as VerificationStatus,
    summary: summary.trim(),
  }
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

/**
 * Run an automated quality-control check on a report using Gemini.
 *
 * This is the single entry point the database layer should call. It performs no
 * database work: retrieve any nearby/recent reports elsewhere and pass them as
 * `relatedReports` for duplicate detection.
 *
 * @throws {VerificationError} for missing configuration, image failures, model
 *   errors, or malformed model output. The original report is never modified.
 */
export async function verifyReport(
  report: ReportForVerification,
  relatedReports: ReportForVerification[] = [],
): Promise<VerificationResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new VerificationError("missing_api_key", "GEMINI_API_KEY is not configured on the server.")
  }

  const inlineImage = await loadInlineImage(report.imageUrl)
  const prompt = buildPrompt(report, relatedReports, Boolean(inlineImage))

  const parts: Array<{ text: string } | { inlineData: InlineImage }> = [{ text: prompt }]
  if (inlineImage) {
    parts.push({ inlineData: inlineImage })
  }

  const ai = new GoogleGenAI({ apiKey })

  let text: string | undefined
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
      },
    })
    text = response.text
  } catch (err) {
    console.log("[v0] Gemini generateContent failed:", err instanceof Error ? err.message : err)
    throw new VerificationError("model_error", "The verification model could not be reached.")
  }

  return parseAndValidate(text)
}

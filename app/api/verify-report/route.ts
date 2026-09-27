import { NextResponse } from "next/server"
import { verifyReport, VerificationError } from "@/lib/gemini/verify-report"
import type { ReportForVerification } from "@/lib/gemini/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Input guardrails so this endpoint can't be abused as an unrestricted Gemini proxy.
const MAX_DESCRIPTION_LEN = 5_000
const MAX_CATEGORY_LEN = 200
const MAX_IMAGE_URL_LEN = 200_000 // allows data URLs, but bounded
const MAX_LOCATION_LEN = 300
const MAX_RELATED_REPORTS = 20

// Very small in-memory fixed-window rate limiter (per instance). Enough to blunt
// abuse for a hackathon; swap for a shared store (e.g. Upstash) in production.
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT
}

function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  return fwd?.split(",")[0]?.trim() || "unknown"
}

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, max)
}

function num(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Normalize an incoming image reference. Data URLs and absolute http(s) URLs are
 * passed through unchanged. Site-relative paths (e.g. "/reports/water.png") are
 * kept as-is and read from the local `public` directory by the service — we do
 * NOT rewrite them to an absolute URL, because behind the preview proxy the
 * request origin is an external domain the sandbox can't fetch back from.
 */
function normalizeImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined
  if (imageUrl.startsWith("data:") || /^https?:\/\//i.test(imageUrl)) return imageUrl
  if (imageUrl.startsWith("/")) return imageUrl
  return undefined
}

function parseReport(input: Record<string, unknown>): ReportForVerification | null {
  const category = str(input.category, MAX_CATEGORY_LEN)
  if (!category) return null
  return {
    id: str(input.id, 200),
    category,
    description: str(input.description, MAX_DESCRIPTION_LEN),
    imageUrl: normalizeImageUrl(str(input.imageUrl, MAX_IMAGE_URL_LEN)),
    latitude: num(input.latitude),
    longitude: num(input.longitude),
    reportedAt: str(input.reportedAt, MAX_LOCATION_LEN),
  }
}

export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many verification requests. Please wait a moment and try again." },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const report = parseReport(body)
  if (!report) {
    return NextResponse.json({ error: "A report with a 'category' is required." }, { status: 400 })
  }

  let relatedReports: ReportForVerification[] = []
  if (Array.isArray(body.relatedReports)) {
    relatedReports = body.relatedReports
      .slice(0, MAX_RELATED_REPORTS)
      .map((r) => (typeof r === "object" && r !== null ? parseReport(r as Record<string, unknown>) : null))
      .filter((r): r is ReportForVerification => r !== null)
  }

  try {
    const verification = await verifyReport(report, relatedReports)
    return NextResponse.json({ verification }, { status: 200 })
  } catch (error) {
    if (error instanceof VerificationError) {
      // Map internal error codes to safe, user-facing responses. Never leak the
      // underlying error detail or the API key.
      switch (error.code) {
        case "missing_api_key":
          console.log("[v0] verify-report: GEMINI_API_KEY missing")
          return NextResponse.json(
            { error: "Verification is not configured on the server.", code: error.code },
            { status: 503 },
          )
        case "image_fetch_failed":
          return NextResponse.json(
            { error: "We couldn't load the report image for verification.", code: error.code },
            { status: 422 },
          )
        case "invalid_model_output":
          return NextResponse.json(
            { error: "The verification result was unreadable. Please retry.", code: error.code },
            { status: 502 },
          )
        case "rate_limited":
          return NextResponse.json(
            { error: "The verification service is busy. Please retry shortly.", code: error.code },
            { status: 429 },
          )
        case "model_error":
        default:
          return NextResponse.json(
            { error: "The verification service is temporarily unavailable. Please retry.", code: error.code },
            { status: 502 },
          )
      }
    }
    console.log("[v0] verify-report unexpected error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Something went wrong during verification." }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { VerificationError, verifyReport } from "@/lib/verification/gemini"
import { RETRYABLE_VERIFICATION_ERRORS, type VerificationErrorCode, type VerifyReportResponse } from "@/lib/verification/types"
import { InputValidationError, LIMITS, parseRelatedReports, parseReport } from "@/lib/verification/validate"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BODY_BYTES = LIMITS.dataUrlChars + 64_000
const RATE_LIMIT = { windowMs: 60_000, max: 10 }

// Best-effort per-instance limiter. Swap for a shared store (e.g. Upstash) if this needs to hold across instances.
const hits = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > RATE_LIMIT.max
}

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function fail(code: VerificationErrorCode, message: string, status: number) {
  const body: VerifyReportResponse = {
    ok: false,
    error: { code, message, retryable: RETRYABLE_VERIFICATION_ERRORS.includes(code) },
  }
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

const STATUS_BY_CODE: Record<VerificationErrorCode, number> = {
  invalid_input: 400,
  not_configured: 503,
  image_unavailable: 422,
  model_error: 502,
  malformed_output: 502,
  timeout: 504,
  rate_limited: 429,
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("invalid_input", "Requests must come from this application.", 403)

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"
  if (isRateLimited(ip)) return fail("rate_limited", "Too many verification requests. Please retry shortly.", 429)

  const contentLength = Number(req.headers.get("content-length") ?? 0)
  if (contentLength > MAX_BODY_BYTES) return fail("invalid_input", "Request is too large.", 413)

  let payload: unknown
  try {
    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) return fail("invalid_input", "Request is too large.", 413)
    payload = JSON.parse(raw)
  } catch {
    return fail("invalid_input", "Invalid JSON body.", 400)
  }

  try {
    const body = (payload ?? {}) as { report?: unknown; relatedReports?: unknown }
    const report = parseReport(body.report)
    const relatedReports = parseRelatedReports(body.relatedReports)
    const result = await verifyReport(report, relatedReports)
    const response: VerifyReportResponse = { ok: true, result }
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    if (err instanceof InputValidationError) return fail("invalid_input", err.message, 400)
    if (err instanceof VerificationError) return fail(err.code, err.message, STATUS_BY_CODE[err.code])
    console.error("[verify-report] Unexpected error", err instanceof Error ? err.name : typeof err)
    return fail("model_error", "Verification failed unexpectedly. Please retry.", 500)
  }
}

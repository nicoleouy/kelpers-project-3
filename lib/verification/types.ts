/**
 * Shared types for the automated report quality-control (verification) layer.
 *
 * This file is safe to import from both client and server code — it contains
 * no secrets and no Gemini SDK usage. The Gemini implementation lives in
 * `lib/verification/gemini.ts` (server-only).
 *
 * TigerData integration: map your database row to `ReportForVerification`
 * before calling `verifyReport()`. Only `category` is required.
 */

/** The minimal information the Gemini quality check needs about a report. */
export type ReportForVerification = {
  id?: string
  category: string
  description?: string
  /**
   * Supported image sources:
   * - App-relative paths to bundled images, e.g. "/reports/smoke.png"
   * - Public Vercel Blob URLs (https://*.public.blob.vercel-storage.com/...)
   * - Base64 data URLs, e.g. "data:image/jpeg;base64,..." (max ~3 MB)
   */
  imageUrl?: string
  latitude?: number
  longitude?: number
  /** ISO 8601 timestamp of when the observation was reported. */
  reportedAt?: string
}

export const VERIFICATION_STATUSES = ["verified", "needs_review", "insufficient_evidence"] as const

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

/** The validated result returned by `verifyReport()` — suitable for storing in TigerData. */
export type VerificationResult = {
  categoryMatch: boolean
  imageSupportsClaim: boolean
  possibleDuplicate: boolean
  /** 0–1. How suitable the evidence is for inclusion in the dataset. */
  qualityScore: number
  status: VerificationStatus
  summary: string
  /** Metadata useful when persisting the result. */
  reportId?: string
  model: string
  checkedAt: string
}

export type VerificationErrorCode =
  | "invalid_input"
  | "not_configured"
  | "image_unavailable"
  | "model_error"
  | "malformed_output"
  | "timeout"
  | "rate_limited"

/** Error codes that are safe for the caller (user or system) to retry. */
export const RETRYABLE_VERIFICATION_ERRORS: readonly VerificationErrorCode[] = [
  "model_error",
  "malformed_output",
  "timeout",
  "rate_limited",
]

/** Response body shape of `POST /api/verify-report`. */
export type VerifyReportResponse =
  | { ok: true; result: VerificationResult }
  | { ok: false; error: { code: VerificationErrorCode; message: string; retryable: boolean } }

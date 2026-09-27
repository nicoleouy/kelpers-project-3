// Shared, framework-agnostic types for the Gemini report-verification layer.
// This file contains ONLY types (no server-only imports) so it can be used by
// both server code (the verification service / API route) and client UI.

/**
 * The minimal shape Gemini needs to quality-check a single report.
 *
 * This is intentionally decoupled from the eventual TigerData schema. The
 * database developer can map their row into this shape before calling
 * `verifyReport(...)`. Every field except `category` is optional so partial
 * records can still be evaluated (Gemini will simply have less to work with).
 */
export interface ReportForVerification {
  /** Report identifier from the datastore (optional; used for logging/dedupe hints). */
  id?: string
  /** The category the reporter selected, e.g. "water-pollution". Required. */
  category: string
  /** Free-text description the reporter wrote. */
  description?: string
  /**
   * Location of the submitted image. May be:
   *  - an absolute URL (https://...)
   *  - a data URL (data:image/png;base64,...)
   *  - a site-relative path (/reports/water.png) — the API route resolves these
   *    to an absolute URL before calling the service.
   */
  imageUrl?: string
  latitude?: number
  longitude?: number
  /** ISO timestamp of when the observation was reported. */
  reportedAt?: string
}

/**
 * Verification outcome. NOTE: this is a QUALITY-CONTROL signal about whether the
 * submitted evidence is internally consistent and suitable for a crowdsourced
 * dataset — NOT a claim that the environmental event is objectively "real".
 */
export type VerificationStatus = "verified" | "needs_review" | "insufficient_evidence"

/**
 * The camelCase result returned to the rest of the application. The database
 * developer can persist this object directly alongside the report.
 */
export interface VerificationResult {
  /** Does the image appear consistent with the selected category? */
  categoryMatch: boolean
  /** Does the image appear consistent with the reporter's description? */
  imageSupportsClaim: boolean
  /** Does this appear to duplicate a nearby/recent report that was provided? */
  possibleDuplicate: boolean
  /** Confidence in the overall quality check, 0..1. */
  qualityScore: number
  status: VerificationStatus
  /** One or two neutral sentences explaining the assessment. */
  summary: string
}

export type VerificationErrorCode =
  | "missing_api_key"
  | "image_fetch_failed"
  | "model_error"
  | "invalid_model_output"

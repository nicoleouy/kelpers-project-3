import { VERIFICATION_STATUSES, type ReportForVerification, type VerificationStatus } from "./types"

export const LIMITS = {
  categoryChars: 80,
  descriptionChars: 2000,
  idChars: 100,
  imageUrlChars: 2048,
  /** Base64 data URLs are larger than the decoded bytes (~4/3). */
  dataUrlChars: 4_200_000,
  imageBytes: 3 * 1024 * 1024,
  relatedReports: 10,
  summaryChars: 600,
} as const

export class InputValidationError extends Error {}

const LOCAL_IMAGE_PATH = /^\/reports\/[a-z0-9][a-z0-9_-]*\.(png|jpe?g|webp)$/i
const DATA_URL = /^data:(image\/(?:png|jpeg|webp|heic|heif));base64,([a-z0-9+/=\s]+)$/i
const ALLOWED_REMOTE_HOST_SUFFIXES = [".public.blob.vercel-storage.com"]

function optionalString(value: unknown, field: string, max: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string") throw new InputValidationError(`${field} must be a string.`)
  const trimmed = value.trim()
  if (trimmed.length > max) throw new InputValidationError(`${field} is too long (max ${max} characters).`)
  return trimmed || undefined
}

function optionalNumber(value: unknown, field: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new InputValidationError(`${field} must be a number between ${min} and ${max}.`)
  }
  return value
}

export function isSupportedImageUrl(url: string): boolean {
  if (LOCAL_IMAGE_PATH.test(url)) return true
  if (url.startsWith("data:")) return DATA_URL.test(url)
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      ALLOWED_REMOTE_HOST_SUFFIXES.some((suffix) => parsed.hostname.endsWith(suffix))
    )
  } catch {
    return false
  }
}

export function parseImageSource(url: string):
  | { kind: "local"; path: string }
  | { kind: "data"; mimeType: string; base64: string }
  | { kind: "remote"; url: URL } {
  if (LOCAL_IMAGE_PATH.test(url)) return { kind: "local", path: url }
  const data = DATA_URL.exec(url)
  if (data) return { kind: "data", mimeType: data[1].toLowerCase(), base64: data[2].replace(/\s/g, "") }
  if (isSupportedImageUrl(url)) return { kind: "remote", url: new URL(url) }
  throw new InputValidationError("Unsupported image source.")
}

export function parseReport(input: unknown, field = "report"): ReportForVerification {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InputValidationError(`${field} must be an object.`)
  }
  const raw = input as Record<string, unknown>

  const category = optionalString(raw.category, `${field}.category`, LIMITS.categoryChars)
  if (!category) throw new InputValidationError(`${field}.category is required.`)

  const imageUrlRaw = raw.imageUrl
  let imageUrl: string | undefined
  if (typeof imageUrlRaw === "string" && imageUrlRaw.startsWith("data:")) {
    if (imageUrlRaw.length > LIMITS.dataUrlChars) throw new InputValidationError(`${field}.imageUrl is too large.`)
    imageUrl = imageUrlRaw
  } else {
    imageUrl = optionalString(imageUrlRaw, `${field}.imageUrl`, LIMITS.imageUrlChars)
  }
  if (imageUrl && !isSupportedImageUrl(imageUrl)) {
    throw new InputValidationError(`${field}.imageUrl is not a supported image source.`)
  }

  const reportedAt = optionalString(raw.reportedAt, `${field}.reportedAt`, 40)
  if (reportedAt && Number.isNaN(Date.parse(reportedAt))) {
    throw new InputValidationError(`${field}.reportedAt must be an ISO 8601 date.`)
  }

  return {
    id: optionalString(raw.id, `${field}.id`, LIMITS.idChars),
    category,
    description: optionalString(raw.description, `${field}.description`, LIMITS.descriptionChars),
    imageUrl,
    latitude: optionalNumber(raw.latitude, `${field}.latitude`, -90, 90),
    longitude: optionalNumber(raw.longitude, `${field}.longitude`, -180, 180),
    reportedAt,
  }
}

export function parseRelatedReports(input: unknown): ReportForVerification[] {
  if (input === undefined || input === null) return []
  if (!Array.isArray(input)) throw new InputValidationError("relatedReports must be an array.")
  if (input.length > LIMITS.relatedReports) {
    throw new InputValidationError(`relatedReports may contain at most ${LIMITS.relatedReports} reports.`)
  }
  // Related reports are compared by metadata only; their images are never sent to Gemini.
  return input.map((r, i) => ({ ...parseReport(r, `relatedReports[${i}]`), imageUrl: undefined }))
}

/** Raw JSON object the model is instructed to produce (snake_case, per the response schema). */
type ModelOutput = {
  category_match: boolean
  image_supports_claim: boolean
  possible_duplicate: boolean
  quality_score: number
  status: VerificationStatus
  summary: string
}

/** Returns the parsed model output, or null if it does not match the expected schema exactly. */
export function parseModelOutput(text: string | undefined): ModelOutput | null {
  if (!text) return null
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  const o = data as Record<string, unknown>

  const booleans = ["category_match", "image_supports_claim", "possible_duplicate"] as const
  if (!booleans.every((k) => typeof o[k] === "boolean")) return null
  if (typeof o.quality_score !== "number" || !Number.isFinite(o.quality_score)) return null
  if (o.quality_score < 0 || o.quality_score > 1) return null
  if (typeof o.status !== "string" || !(VERIFICATION_STATUSES as readonly string[]).includes(o.status)) return null
  if (typeof o.summary !== "string") return null
  const summary = o.summary.trim()
  if (!summary || summary.length > LIMITS.summaryChars) return null

  return {
    category_match: o.category_match as boolean,
    image_supports_claim: o.image_supports_claim as boolean,
    possible_duplicate: o.possible_duplicate as boolean,
    quality_score: o.quality_score,
    status: o.status as VerificationStatus,
    summary,
  }
}

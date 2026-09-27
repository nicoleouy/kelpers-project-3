import { CATEGORIES, SEVERITY_ORDER } from "@/lib/categories"
import type { CategoryId, Severity } from "@/lib/types"

export interface NewReportInput {
  category: CategoryId
  description: string
  severity: Severity
  latitude: number
  longitude: number
  tags: string[]
  image?: string
  approximateLocation?: string
  isCrisis?: boolean
}

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id))

export class ReportValidationError extends Error {}

function fail(message: string): never {
  throw new ReportValidationError(message)
}

function coordinate(value: unknown, name: string, limit: number): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value
  if (typeof n !== "number" || !Number.isFinite(n)) fail(`${name} must be a number.`)
  if (n < -limit || n > limit) fail(`${name} must be between -${limit} and ${limit}.`)
  return n
}

function optionalText(value: unknown, name: string, max: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string") fail(`${name} must be a string.`)
  const trimmed = value.trim()
  if (trimmed.length > max) fail(`${name} must be ${max} characters or fewer.`)
  return trimmed || undefined
}

export function parseNewReport(body: unknown): NewReportInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("Request body must be a JSON object.")
  const raw = body as Record<string, unknown>

  if (typeof raw.category !== "string" || !CATEGORY_IDS.has(raw.category)) fail("category is not a valid category.")
  if (typeof raw.severity !== "string" || !(SEVERITY_ORDER as string[]).includes(raw.severity)) {
    fail(`severity must be one of: ${SEVERITY_ORDER.join(", ")}.`)
  }
  if (typeof raw.description !== "string" || raw.description.trim().length === 0) fail("description is required.")
  const description = raw.description.trim()
  if (description.length > 2000) fail("description must be 2000 characters or fewer.")

  const tags = raw.tags === undefined ? [] : raw.tags
  if (!Array.isArray(tags) || tags.length > 20 || !tags.every((t) => typeof t === "string" && t.trim().length <= 40)) {
    fail("tags must be up to 20 strings of 40 characters or fewer.")
  }

  const image = optionalText(raw.image, "image", 2048)
  if (image && !image.startsWith("/") && !image.startsWith("https://")) fail("image must be a site path or https URL.")

  if (raw.isCrisis !== undefined && typeof raw.isCrisis !== "boolean") fail("isCrisis must be a boolean.")

  return {
    category: raw.category as CategoryId,
    description,
    severity: raw.severity as Severity,
    latitude: coordinate(raw.latitude, "latitude", 90),
    longitude: coordinate(raw.longitude, "longitude", 180),
    tags: (tags as string[]).map((t) => t.trim()).filter(Boolean),
    image,
    approximateLocation: optionalText(raw.approximateLocation, "approximateLocation", 200),
    isCrisis: raw.isCrisis as boolean | undefined,
  }
}

import type { Report } from "@/lib/types"
import type { ReportForVerification, VerificationResult, VerifyReportResponse } from "./types"

export type VerificationState =
  | { state: "pending" }
  | { state: "done"; result: VerificationResult }
  | { state: "error"; message: string; retryable: boolean }

export function toReportForVerification(report: Report): ReportForVerification {
  return {
    id: report.id,
    category: report.category,
    description: report.description,
    imageUrl: report.image,
    latitude: report.latitude,
    longitude: report.longitude,
    reportedAt: report.createdAt,
  }
}

/** Calls the server endpoint. Never throws — failures become an error state. */
export async function requestVerification(
  report: Report,
  relatedReports: Report[] = [],
): Promise<Exclude<VerificationState, { state: "pending" }>> {
  try {
    const res = await fetch("/api/verify-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: toReportForVerification(report),
        relatedReports: relatedReports.map(toReportForVerification),
      }),
    })
    const data = (await res.json()) as VerifyReportResponse
    if (data.ok) return { state: "done", result: data.result }
    return { state: "error", message: data.error.message, retryable: data.error.retryable }
  } catch {
    return { state: "error", message: "Couldn't reach the verification service.", retryable: true }
  }
}

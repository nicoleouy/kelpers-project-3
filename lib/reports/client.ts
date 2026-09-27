import type { Report } from "@/lib/types"
import type { NewReportInput } from "./validate"

type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string }

export async function fetchReports(url: string): Promise<Report[]> {
  const res = await fetch(url, { cache: "no-store" })
  const data = (await res.json().catch(() => null)) as ApiResult<{ reports: Report[] }> | null
  if (!data?.ok) throw new Error(data && !data.ok ? data.error : `Failed to load reports (${res.status}).`)
  return data.reports
}

/** Never throws — network and server failures become `{ ok: false }`. */
export async function createReport(input: NewReportInput): Promise<ApiResult<{ report: Report }>> {
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = (await res.json().catch(() => null)) as ApiResult<{ report: Report }> | null
    if (res.ok && data?.ok) return data
    return { ok: false, error: data && !data.ok ? data.error : `Couldn't save your report (${res.status}).` }
  } catch {
    return { ok: false, error: "Couldn't reach the server. Your report was not saved." }
  }
}

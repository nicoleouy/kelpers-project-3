import { NextResponse } from "next/server"
import { insertReport, listReports } from "@/lib/reports/repository"
import { ReportValidationError, parseNewReport } from "@/lib/reports/validate"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const reports = await listReports()
    return NextResponse.json({ ok: true, reports })
  } catch (err) {
    console.error("[api/reports] GET failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: "Couldn't load reports." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 })
  }

  try {
    const input = parseNewReport(body)
    const report = await insertReport(input)
    return NextResponse.json({ ok: true, report }, { status: 201 })
  } catch (err) {
    if (err instanceof ReportValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 })
    }
    console.error("[api/reports] POST failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: "Couldn't save your report. Please try again." }, { status: 500 })
  }
}

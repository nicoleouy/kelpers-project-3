import { NextResponse } from "next/server"
import { getIntelligence, peekIntelligence } from "@/lib/intelligence"
import type { IntelligenceResponse } from "@/lib/intelligence/types"

export const runtime = "nodejs"
export const maxDuration = 120

const unavailable = (err: unknown) => {
  console.error("[intelligence] analysis failed:", err)
  const body: IntelligenceResponse = {
    status: "error",
    error: "Pattern analysis is temporarily unavailable. Please try again shortly.",
  }
  return NextResponse.json(body, { status: 503 })
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  try {
    if (params.get("cached") === "1") return NextResponse.json(await peekIntelligence())
    const result = await getIntelligence({ refresh: params.get("refresh") === "1" })
    return NextResponse.json(result)
  } catch (err) {
    return unavailable(err)
  }
}

/** Explicit "Run analysis": re-reads Tiger Data reports and asks Grok for a fresh analysis. */
export async function POST() {
  try {
    return NextResponse.json(await getIntelligence({ refresh: true }))
  } catch (err) {
    return unavailable(err)
  }
}

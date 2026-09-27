import { NextResponse } from "next/server"
import { getIntelligence } from "@/lib/intelligence"
import type { IntelligenceResponse } from "@/lib/intelligence/types"

export const runtime = "nodejs"
export const maxDuration = 120

export async function GET(request: Request) {
  const refresh = new URL(request.url).searchParams.get("refresh") === "1"
  try {
    const result = await getIntelligence({ refresh })
    return NextResponse.json(result)
  } catch (err) {
    console.error("[intelligence] analysis failed:", err)
    const body: IntelligenceResponse = {
      status: "error",
      error: "Pattern analysis is temporarily unavailable. Please try again shortly.",
    }
    return NextResponse.json(body, { status: 503 })
  }
}

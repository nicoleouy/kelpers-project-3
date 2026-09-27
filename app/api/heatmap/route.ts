import { NextResponse } from "next/server"
import { getHeatmap } from "@/lib/heatmap/repository"
import { isHeatmapCategory } from "@/lib/heatmap/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category") ?? "community"
  if (!isHeatmapCategory(category)) {
    return NextResponse.json({ ok: false, error: "category must be 'community' or 'crisis'." }, { status: 400 })
  }

  try {
    const data = await getHeatmap(category)
    return NextResponse.json({ ok: true, ...data })
  } catch (err) {
    console.error("[api/heatmap] GET failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: "Couldn't load map data right now." }, { status: 500 })
  }
}

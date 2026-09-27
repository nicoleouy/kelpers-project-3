import { NextResponse } from "next/server"

export const runtime = "nodejs"

const MAX_CHARS = 5000

// Public ElevenLabs voice id (Rachel). Override with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID

  if (!apiKey) {
    return NextResponse.json(
      { error: "Text-to-speech isn’t configured. Add an ELEVENLABS_API_KEY on the server." },
      { status: 503 },
    )
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const rawText = (payload as { text?: unknown } | null)?.text
  const text = typeof rawText === "string" ? rawText.trim() : ""

  if (!text) {
    return NextResponse.json({ error: "No text was provided to read aloud." }, { status: 400 })
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: "The text is too long to read aloud." }, { status: 413 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
  } catch {
    return NextResponse.json({ error: "Could not reach the speech service." }, { status: 502 })
  }

  if (!upstream.ok) {
    let detail = "Failed to generate audio."
    try {
      const errBody = (await upstream.json()) as { detail?: { message?: string } | string; message?: string }
      const message =
        typeof errBody.detail === "string"
          ? errBody.detail
          : errBody.detail?.message || errBody.message
      if (message) detail = message
    } catch {
      // Keep the generic message if the upstream body isn't JSON.
    }
    return NextResponse.json({ error: detail }, { status: 502 })
  }

  const audio = await upstream.arrayBuffer()
  if (!audio.byteLength) {
    return NextResponse.json({ error: "The speech service returned empty audio." }, { status: 502 })
  }

  return new NextResponse(audio, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
      "Cache-Control": "no-store",
    },
  })
}

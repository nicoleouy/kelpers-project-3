"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, RotateCcw, Square, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "idle" | "loading" | "playing" | "error"

// Module-level registry so that starting one Listen button stops every other one.
const activeStoppers = new Set<() => void>()

function messageFromResponse(res: Response, fallback: string) {
  return res
    .clone()
    .json()
    .then((body: { error?: string }) => (typeof body?.error === "string" && body.error ? body.error : fallback))
    .catch(() => fallback)
}

export function ListenButton({
  text,
  label = "Listen",
  className,
  size = "default",
}: {
  text: string
  label?: string
  className?: string
  size?: "default" | "sm"
}) {
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const activeRef = useRef(false)

  const teardown = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.src = ""
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    activeRef.current = false
  }, [])

  const stop = useCallback(() => {
    teardown()
    setStatus("idle")
  }, [teardown])

  useEffect(() => {
    activeStoppers.add(stop)
    return () => {
      activeStoppers.delete(stop)
      teardown()
    }
  }, [stop, teardown])

  const start = useCallback(async () => {
    // Toggling while active stops playback / generation.
    if (status === "playing" || status === "loading") {
      stop()
      return
    }

    // Never autoplay — this only runs from a click. Stop any other player first.
    activeStoppers.forEach((s) => {
      if (s !== stop) s()
    })

    setStatus("loading")
    setError(null)
    activeRef.current = true

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        throw new Error(await messageFromResponse(res, "Could not generate audio."))
      }

      const blob = await res.blob()
      const playable = blob.size > 0 && (!blob.type || blob.type.startsWith("audio/"))
      if (!playable) {
        throw new Error("The speech service did not return playable audio.")
      }
      if (!activeRef.current) return // stopped while we were generating

      const url = URL.createObjectURL(blob)
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        teardown()
        setStatus("idle")
      }
      audio.onerror = () => {
        teardown()
        setError("Audio playback failed.")
        setStatus("error")
      }

      await audio.play()
      if (!activeRef.current) return
      setStatus("playing")
    } catch (err) {
      teardown()
      setError(err instanceof Error ? err.message : "Could not generate audio.")
      setStatus("error")
    }
  }, [status, stop, teardown, text])

  const view = {
    idle: { icon: <Volume2 className="size-4" />, text: label },
    loading: { icon: <Loader2 className="size-4 animate-spin" />, text: "Generating…" },
    playing: { icon: <Square className="size-3.5 fill-current" />, text: "Stop" },
    error: { icon: <RotateCcw className="size-4" />, text: "Retry" },
  }[status]

  return (
    <span className={cn("inline-flex max-w-full flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={start}
        disabled={!text.trim() && status === "idle"}
        aria-label={
          status === "playing" ? "Stop audio" : status === "error" ? "Retry reading aloud" : `Listen to ${label}`
        }
        title={error ?? undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors disabled:opacity-50",
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
          status === "playing"
            ? "border-primary bg-primary/10 text-primary"
            : status === "error"
              ? "border-crisis/40 bg-crisis/10 text-crisis"
              : "border-border bg-card text-foreground hover:bg-secondary",
        )}
      >
        {view.icon}
        {view.text}
      </button>
      {status === "error" && error && (
        <span className="max-w-[16rem] text-[11px] leading-snug text-crisis">{error}</span>
      )}
    </span>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "kelpers-pwa-install-dismissed"

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia("(display-mode: standalone)").matches) return
    if ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)) {
      return
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return
    } catch {
      // Ignore storage failures.
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  if (!visible || !event) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.75rem] z-50 flex justify-center px-4 md:bottom-6">
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Install kelpers</span>
          <span className="block text-xs text-muted-foreground">Add it to your home screen for faster reporting.</span>
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          onClick={async () => {
            await event.prompt()
            await event.userChoice
            setVisible(false)
            setEvent(null)
          }}
        >
          <Download className="size-3.5" />
          Install
        </button>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          onClick={() => {
            setVisible(false)
            try {
              sessionStorage.setItem(DISMISS_KEY, "1")
            } catch {
              // Ignore.
            }
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

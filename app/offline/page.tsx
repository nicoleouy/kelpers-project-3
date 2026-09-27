import Link from "next/link"
import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-secondary text-muted-foreground">
        <WifiOff className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        kelpers can still open saved pages. Reconnect to submit reports, listen to details, or load the live map.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Try home
      </Link>
    </div>
  )
}

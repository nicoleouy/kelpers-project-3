"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import {
  Home,
  LifeBuoy,
  Map as MapIcon,
  Microscope,
  Plus,
  Siren,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"

const primaryNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/help", label: "Kelp Others", icon: LifeBuoy },
  { href: "/research", label: "Research", icon: Microscope },
  { href: "/profile", label: "Profile", icon: User },
]

const bottomNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/research", label: "Research", icon: Microscope },
  { href: "/report", label: "Report", icon: Plus, center: true },
  { href: "/crisis", label: "Crisis", icon: Siren },
  { href: "/profile", label: "You", icon: User },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kelpers-logo.jpeg" alt="kelpers logo" className="size-full object-cover" />
      </span>
      <span className="font-display text-xl font-semibold text-foreground">kelpers</span>
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { viewMode, setViewMode } = useStore()
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))
  const onOrganization = pathname.startsWith("/organization")

  const switchToCommunity = () => {
    setViewMode("community")
    if (onOrganization) router.push("/")
  }

  const switchToOrganization = () => {
    setViewMode("organization")
    if (!onOrganization) router.push("/organization")
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <header className="sticky top-0 z-40 shrink-0 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Brand />

          <nav className="hidden items-center gap-1 md:flex">
            {primaryNav.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={switchToCommunity}
                aria-pressed={viewMode === "community"}
                className={cn(
                  "rounded-full px-2.5 py-1.5 transition-colors sm:px-3",
                  viewMode === "community" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Community
              </button>
              <button
                type="button"
                onClick={switchToOrganization}
                aria-pressed={viewMode === "organization"}
                className={cn(
                  "rounded-full px-2.5 py-1.5 transition-colors sm:px-3",
                  viewMode === "organization" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Organization
              </button>
            </div>

            <Link
              href="/crisis"
              className="hidden items-center gap-1.5 rounded-full bg-crisis px-3.5 py-2 text-sm font-semibold text-crisis-foreground shadow-sm transition-transform hover:scale-[1.03] md:flex"
            >
              <Siren className="size-4" />
              Crisis
            </Link>

            <Link
              href="/report"
              className="hidden items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.03] sm:flex"
            >
              <Plus className="size-4" />
              <span>Report</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-4 pb-6 pt-6 md:pb-16">
        {children}
      </main>

      {/* Mobile bottom navigation — in normal flow so the page scrollbar stops above it */}
      <nav
        className="z-40 shrink-0 border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-1 py-1.5">
          {bottomNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            if (item.center) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="-mt-6 flex flex-col items-center"
                  aria-label={item.label}
                >
                  <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                    <Icon className="size-6" />
                  </span>
                </Link>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 whitespace-nowrap rounded-lg py-1.5 text-[10px] font-medium transition-colors min-[360px]:text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                  item.href === "/crisis" && "text-crisis",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

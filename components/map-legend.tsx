"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Info } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import { cn } from "@/lib/utils"

function Swatch({
  color,
  icon,
  size = 24,
  badge,
  pulse,
}: {
  color: string
  icon: string
  size?: number
  badge?: string
  pulse?: boolean
}) {
  return (
    <span
      className={cn("eco-marker shrink-0", pulse && "eco-pulse")}
      style={{ width: size, height: size, background: color, position: "relative" }}
    >
      <CategoryIcon name={icon} />
      {badge && (
        <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full border-2 border-white bg-crisis text-[8px] font-bold text-white">
          {badge}
        </span>
      )}
    </span>
  )
}

export function MapLegend() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    setOpen(mq.matches)
    const onChange = () => setOpen(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const items = [
    {
      swatch: <Swatch color="#a16207" icon="Trash2" size={22} />,
      title: "Individual report",
      desc: "A single observation, colored by category.",
    },
    {
      swatch: <Swatch color="#dc2626" icon="Flame" size={26} badge="3" pulse />,
      title: "Grouped incident",
      desc: "Likely-related reports, with a live report count.",
    },
    {
      swatch: <Swatch color="#16a34a" icon="HeartPulse" size={22} />,
      title: "Volunteer opportunity",
      desc: "A way to help nearby.",
    },
  ]

  return (
    <div className="absolute bottom-3 left-3 z-[700] max-w-[16rem]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur"
      >
        <Info className="size-3.5 text-primary" />
        Legend
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
          {items.map((item) => (
            <div key={item.title} className="flex items-start gap-2.5">
              {item.swatch}
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight">{item.title}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
          <p className="border-t border-border pt-2 text-[11px] leading-tight text-muted-foreground">
            Larger circles indicate higher severity.
          </p>
        </div>
      )}
    </div>
  )
}

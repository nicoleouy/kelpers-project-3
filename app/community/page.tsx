"use client"

import Link from "next/link"
import { ArrowRight, Heart, Users } from "lucide-react"
import { FollowButton } from "@/components/follow-button"
import { OpportunityCard } from "@/components/opportunity-card"
import { useStore } from "@/lib/store"
import { COMMUNITY_MEMBERS } from "@/lib/mock-data"

const GALLERY = [
  {
    image: "/reports/cleanup.png",
    caption: "Park cleanup crew",
    location: "Piedmont Park",
    org: "Piedmont Park Conservancy",
  },
  {
    image: "/reports/tree.png",
    caption: "Native tree planting",
    location: "Atlanta BeltLine",
    org: "Trees Atlanta",
  },
  {
    image: "/reports/water.png",
    caption: "River restoration day",
    location: "Chattahoochee River",
    org: "Chattahoochee Riverkeeper",
  },
  {
    image: "/reports/wildlife.png",
    caption: "Bird habitat survey",
    location: "Freedom Park",
    org: "Georgia Audubon",
  },
  {
    image: "/reports/beach.png",
    caption: "Shoreline debris removal",
    location: "Tybee Island",
    org: "Coastal Georgia Alliance",
  },
  {
    image: "/reports/litter.png",
    caption: "Neighborhood litter sweep",
    location: "Downtown Atlanta",
    org: "Climate Action ATL",
  },
]

export default function CommunityPage() {
  const { volunteer } = useStore()

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/20 p-6 md:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
          <Users className="size-3.5" />
          Community
        </span>
        <h1 className="mt-4 text-balance font-display text-3xl font-semibold leading-tight md:text-4xl">
          The people behind the change
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm text-muted-foreground md:text-base">
          Every week, neighbors turn reports into real action. Explore the work happening across the community and find
          your next opportunity to get involved.
        </p>
        <Link
          href="/help"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.03]"
        >
          <Heart className="size-4" />
          Find ways to help
        </Link>
      </section>

      {/* Gallery */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold">Work being done</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((item) => (
            <figure
              key={item.caption}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image || "/placeholder.svg"}
                alt={`${item.caption} at ${item.location}`}
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-4">
                <p className="font-display text-base font-semibold text-white">{item.caption}</p>
                <p className="text-xs text-white/80">
                  {item.org} · {item.location}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold">People in the community</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMMUNITY_MEMBERS.map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <span
                className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: person.color }}
              >
                {person.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.location} · {person.reports} reports · {person.cause}
                </p>
              </div>
              <FollowButton userId={person.id} size="sm" />
            </div>
          ))}
        </div>
      </section>

      {/* Volunteer opportunities */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Volunteer opportunities</h2>
            <p className="text-sm text-muted-foreground">Sign up to join upcoming community efforts near you.</p>
          </div>
          <Link href="/help" className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex">
            View all
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {volunteer.map((o) => (
            <OpportunityCard key={o.id} opp={o} />
          ))}
        </div>
      </section>
    </div>
  )
}

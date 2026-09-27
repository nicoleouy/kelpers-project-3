"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Check, Database, Download, FlaskConical, Lock, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { IntelligencePanel } from "@/components/intelligence/intelligence-panel"
import { AiConclusionsSection } from "@/components/research/ai-conclusions"
import {
  CATEGORY_DISTRIBUTION,
  IMPACT_STATS,
  REGION_DISTRIBUTION,
  REPORTS_OVER_TIME,
} from "@/lib/mock-data"

const PIE_COLORS = ["#16a34a", "#0369a1", "#a16207", "#ca8a04", "#0891b2", "#4d7c0f", "#64748b"]

const RESEARCH_CATEGORIES = [
  "Air / Smoke",
  "Water Pollution",
  "Litter",
  "Wildlife",
  "Flooding",
  "Trees",
  "Coastal",
  "Climate",
]

const STATUS_META: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-primary/15 text-primary" },
  "under-review": { label: "Under review", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  submitted: { label: "Submitted", className: "bg-secondary text-muted-foreground" },
}

export default function ResearchPage() {
  const { research, addResearch } = useStore()
  const [researcherName, setResearcherName] = useState("")
  const [region, setRegion] = useState("")
  const [dateRange, setDateRange] = useState("")
  const [purpose, setPurpose] = useState("")
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const estimated = useMemo(
    () => IMPACT_STATS.observationsThisMonth - Math.round(selectedCats.length * 137.5) * (selectedCats.length ? 1 : 0),
    [selectedCats],
  )

  const toggleCat = (c: string) =>
    setSelectedCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  const canSubmit = researcherName.trim() && region.trim() && selectedCats.length > 0

  const submit = () => {
    if (!canSubmit) return
    addResearch({
      researcherName: researcherName.trim(),
      region: region.trim(),
      dateRange: dateRange.trim() || "Not specified",
      categories: selectedCats,
      purpose: purpose.trim(),
      estimatedObservationCount: Math.max(200, estimated),
    })
    setSubmitted(true)
    setResearcherName("")
    setRegion("")
    setDateRange("")
    setPurpose("")
    setSelectedCats([])
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-3xl bg-[#0369a1]/8 p-6 md:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#0369a1] text-white">
          <FlaskConical className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold">Research & data access</h1>
        <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">
          Aggregated, anonymized community observations power environmental research. Explore the open dataset or
          request access for a study.
        </p>
      </section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Observations / month", value: IMPACT_STATS.observationsThisMonth.toLocaleString() },
          { label: "Likely incidents", value: IMPACT_STATS.likelyIncidents.toLocaleString() },
          { label: "Categories tracked", value: IMPACT_STATS.categories },
          { label: "Active regions", value: IMPACT_STATS.regions },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-display text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">Reports over time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORTS_OVER_TIME} margin={{ left: -20 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="currentColor" opacity={0.5} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="currentColor" opacity={0.5} />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="reports" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">By category</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CATEGORY_DISTRIBUTION} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {CATEGORY_DISTRIBUTION.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {CATEGORY_DISTRIBUTION.map((c, i) => (
              <span key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Reports by region</h2>
          <Button variant="secondary" size="sm">
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REGION_DISTRIBUTION} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} stroke="currentColor" opacity={0.5} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={70} stroke="currentColor" opacity={0.7} />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#0369a1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <IntelligencePanel />

      {/* Privacy note */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          All research data is aggregated and anonymized. Individual identities and exact locations are never shared —
          only approximate areas and category-level trends.
        </p>
      </div>

      {/* Request access + existing */}
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Request data access</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Tell us about your study. We&apos;ll review and provide an anonymized dataset.
          </p>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary/5 p-6 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
                <Check className="size-6" />
              </span>
              <p className="font-semibold">Request submitted for review</p>
              <p className="text-sm text-muted-foreground">
                You&apos;ll receive access details once your request is approved.
              </p>
              <Button variant="secondary" onClick={() => setSubmitted(false)}>
                Submit another request
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Researcher / institution</span>
                  <input
                    value={researcherName}
                    onChange={(e) => setResearcherName(e.target.value)}
                    placeholder="e.g. Dr. Lena Ortiz"
                    className="rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Region of interest</span>
                  <input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. Atlanta, GA"
                    className="rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Date range</span>
                <input
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  placeholder="e.g. Jan 2026 – Sep 2026"
                  className="rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <div>
                <span className="mb-2 block text-sm font-medium">Categories</span>
                <div className="flex flex-wrap gap-2">
                  {RESEARCH_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCat(c)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        selectedCats.includes(c) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Research purpose</span>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  placeholder="Briefly describe your study and how the data will be used..."
                  className="resize-none rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="size-4" />
                  Estimated matching observations
                </span>
                <span className="font-display text-lg font-semibold">
                  {selectedCats.length ? Math.max(200, estimated).toLocaleString() : "—"}
                </span>
              </div>

              <Button onClick={submit} disabled={!canSubmit} className="w-full">
                Submit request
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-lg font-semibold">Recent requests</h3>
          {research.map((r) => {
            const status = STATUS_META[r.status]
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold leading-tight">{r.researcherName}</p>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.className)}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.region} · {r.dateRange}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.categories.map((c) => (
                    <Badge key={c} variant="secondary" className="font-normal">
                      {c}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3" />
                  ~{r.estimatedObservationCount.toLocaleString()} anonymized observations
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <AiConclusionsSection />
    </div>
  )
}

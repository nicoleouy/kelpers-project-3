import L from "leaflet"

// leaflet.heat is a classic plugin that attaches itself to window.L, so L must be global first.
if (typeof window !== "undefined") {
  ;(window as unknown as { L: typeof L }).L = L
}

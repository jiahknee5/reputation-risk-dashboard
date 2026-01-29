export default function DemoBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 mb-6 flex items-center gap-3">
      <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
        Demo
      </span>
      <span className="text-amber-400/90 text-sm">
        All data shown is <strong>synthetic demo data</strong> generated for demonstration purposes.
        Not sourced from live feeds.
      </span>
    </div>
  )
}

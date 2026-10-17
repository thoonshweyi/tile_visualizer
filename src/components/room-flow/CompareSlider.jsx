export default function CompareSlider({ value, onChange }) {
  return (
    <div className="absolute inset-0 z-50 select-none" aria-label="Before and after comparison">
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur-sm">Before</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#ef4444]/90 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur-sm">After</span>

      <input
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Move before and after comparison slider"
        className="absolute inset-0 z-20 m-0 h-full w-full cursor-ew-resize opacity-0"
      />

      <div className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,.7)]" style={{ left: `${value}%` }}>
        <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#242424]/90 text-[13px] font-bold tracking-[-0.18em] text-white shadow-[0_4px_16px_rgba(0,0,0,.4)]">◀▶</span>
      </div>
    </div>
  )
}

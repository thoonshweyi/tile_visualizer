export default function Brand() {
  return (
    <div className="flex items-center gap-3" aria-label="Tile Room Studio">
      <span className="grid size-9 grid-cols-2 gap-1 rounded-lg bg-[#242424] p-2">
        <i className="border border-[#ef4444]" /><i className="border border-[#ef4444]" />
        <i className="border border-[#ef4444]" /><i className="border border-[#ef4444]" />
      </span>
      <span className="flex flex-col"><strong className="text-[15px] leading-none tracking-[-0.04em]">TileRoom</strong><small className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#888]">visual studio</small></span>
    </div>
  )
}

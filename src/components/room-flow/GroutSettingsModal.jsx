const GROUT_COLORS = [
  '#ffffff', '#e7e0d8', '#dddcd3', '#d1d2b8', '#bd9e77',
  '#aa916d', '#e4e6e1', '#f7f5ef', '#d9d1d1', '#c7c7c7',
  '#d2d1b2', '#b9b9b9', '#a4a79e', '#989b8d', '#ddcfb8',
  '#e4e4e4', '#c7c4a7', '#bf9287', '#69473d', '#504d45',
  '#88827e', '#687680', '#929292', '#a9a9a9', '#3d3d3d',
]

export default function GroutSettingsModal({ areaName, setting, onChange, onReset, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#242424]/45 p-5 backdrop-blur-[1px]"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="w-full max-w-[360px] overflow-hidden rounded-xl bg-white shadow-[0_24px_80px_rgba(0,0,0,.3)]" role="dialog" aria-modal="true" aria-labelledby="grout-settings-title">
        <header className="flex items-center justify-between border-b border-[#e6e6e6] px-5 py-4">
          <div>
            <h2 id="grout-settings-title" className="text-sm font-bold">Grout settings</h2>
            <p className="mt-0.5 text-[8px] text-[#888]">Adjusting {areaName}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-lg text-[#777] hover:bg-[#f2f2f2] hover:text-[#222]" aria-label="Close grout settings">×</button>
        </header>

        <div className="p-5">
          <label className="block">
            <span className="mb-2 flex items-center justify-between text-[10px] font-semibold text-[#444]"><span>Gap</span><span className="tabular-nums">{setting.gap.toFixed(1)} px</span></span>
            <input type="range" min="0" max="16" step="0.5" value={setting.gap} onChange={(event) => onChange('gap', Number(event.target.value))} className="h-1.5 w-full cursor-pointer accent-[#ef4444]" />
          </label>

          <div className="my-5 h-px bg-[#ededed]" />

          <div>
            <span className="mb-3 flex items-center justify-between text-[10px] font-semibold text-[#444]"><span>Grout color</span><span className="size-5 rounded border border-black/10" style={{ backgroundColor: setting.color }} /></span>
            <div className="grid grid-cols-5 gap-3">
              {GROUT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange('color', color)}
                  aria-label={`Use grout color ${color}`}
                  aria-pressed={setting.color === color}
                  className={`aspect-square rounded-md border transition hover:scale-105 ${setting.color === color ? 'border-[#ef4444] ring-2 ring-[#ef4444]/25' : 'border-black/10'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-[#e8e8e8] bg-[#fafafa] px-5 py-3">
          <button type="button" onClick={onReset} className="text-[9px] font-semibold text-[#777] hover:text-[#ef4444]">Reset default</button>
          <button type="button" onClick={onClose} className="rounded-full bg-[#242424] px-5 py-2 text-[9px] font-bold text-white hover:bg-black">Done</button>
        </footer>
      </section>
    </div>
  )
}

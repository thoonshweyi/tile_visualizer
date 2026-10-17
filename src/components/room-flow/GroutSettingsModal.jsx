import { useEffect, useRef, useState } from 'react'

const GROUT_COLORS = [
  '#ffffff', '#e7e0d8', '#dddcd3', '#d1d2b8', '#bd9e77',
  '#aa916d', '#e4e6e1', '#f7f5ef', '#d9d1d1', '#c7c7c7',
  '#d2d1b2', '#b9b9b9', '#a4a79e', '#989b8d', '#ddcfb8',
  '#e4e4e4', '#c7c4a7', '#bf9287', '#69473d', '#504d45',
  '#88827e', '#687680', '#929292', '#a9a9a9', '#3d3d3d',
]

export default function GroutSettingsModal({ areaName, setting, onChange, onReset, onClose }) {
  const panelRef = useRef(null)
  const dragRef = useRef(null)
  const [entered, setEntered] = useState(false)
  const [position, setPosition] = useState(() => ({
    x: Math.max(12, window.innerWidth - 384),
    y: Math.max(12, (window.innerHeight - 560) / 2),
  }))

  const constrainPosition = (nextPosition) => {
    const panel = panelRef.current
    if (!panel) return nextPosition
    const margin = 12
    return {
      x: Math.min(Math.max(margin, nextPosition.x), Math.max(margin, window.innerWidth - panel.offsetWidth - margin)),
      y: Math.min(Math.max(margin, nextPosition.y), Math.max(margin, window.innerHeight - panel.offsetHeight - margin)),
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPosition((current) => constrainPosition(current))
      setEntered(true)
    })
    const handleResize = () => setPosition((current) => constrainPosition(current))
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const startDragging = (event) => {
    if (event.target.closest('button')) return
    const panel = panelRef.current
    if (!panel) return
    const bounds = panel.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const movePanel = (event) => {
    const dragging = dragRef.current
    if (!dragging || dragging.pointerId !== event.pointerId) return
    setPosition(constrainPosition({
      x: event.clientX - dragging.offsetX,
      y: event.clientY - dragging.offsetY,
    }))
  }

  const stopDragging = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#242424]/45 backdrop-blur-[1px]"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={panelRef}
        style={{
          left: position.x,
          top: position.y,
          transform: entered ? 'translateX(0)' : 'translateX(calc(100% + 32px))',
        }}
        className="fixed flex max-h-[calc(100dvh-24px)] w-[min(360px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_80px_rgba(0,0,0,.3)] transition-transform duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grout-settings-title"
      >
        <header
          onPointerDown={startDragging}
          onPointerMove={movePanel}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          className="flex touch-none select-none items-center justify-between border-b border-[#e6e6e6] px-5 py-4 cursor-grab active:cursor-grabbing"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#f2f2f2] text-[12px] tracking-[-0.18em] text-[#777]" aria-hidden="true">⠿</span>
            <div className="min-w-0">
              <h2 id="grout-settings-title" className="text-sm font-bold">Grout settings</h2>
              <p className="mt-0.5 truncate text-[8px] text-[#888]">{areaName} · Drag panel to move</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-lg text-[#777] hover:bg-[#f2f2f2] hover:text-[#222]" aria-label="Close grout settings">×</button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5">
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

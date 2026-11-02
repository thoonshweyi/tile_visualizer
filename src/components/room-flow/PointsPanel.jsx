import { useState } from 'react'

import { normalizeAreaName } from './flowUtils'
import { DEFAULT_TEXTURE_ADJUSTMENT } from './flowData'
import Icon from './Icon'

function TextureSlider({ label, value, displayValue, min, max, step, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[8px] font-semibold text-[#555]">
        <span>{label}</span>
        <span className="tabular-nums text-[#222]">{displayValue}</span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer accent-[#ef4444]"
      />
    </label>
  )
}

export default function PointsPanel({
  areas,
  activeAreaId,
  pointsByArea,
  selectedProductsByArea,
  textureAdjustmentsByArea,
  onSelectArea,
  onDeleteArea,
  onUpdateArea,
  onOpenProducts,
  maskStates,
  pointMode,
  onStartPoints,
  onResetPoints,
  onTextureAdjustmentChange,
  onResetTextureAdjustment,
  isAddingArea,
  pendingArea,
  draftName,
  setDraftName,
  draftType,
  setDraftType,
  onStartAdd,
  onCancelAdd,
  onSaveArea,
}) {
  const [filter, setFilter] = useState('All')
  const [editingAreaId, setEditingAreaId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('Wall')
  const visibleAreas = filter === 'All' ? areas : areas.filter((area) => area.type === filter)
  const areaLimitReached = areas.length >= 6
  const duplicateName = Boolean(draftName.trim()) && areas.some((area) => normalizeAreaName(area.name) === normalizeAreaName(draftName))
  const duplicateEditName = Boolean(editName.trim()) && areas.some((area) => (
    area.id !== editingAreaId
    && normalizeAreaName(area.name) === normalizeAreaName(editName)
  ))

  const startEditingArea = (area) => {
    setEditingAreaId(area.id)
    setEditName(area.name)
    setEditType(area.type)
  }

  const cancelEditingArea = () => {
    setEditingAreaId(null)
    setEditName('')
    setEditType('Wall')
  }

  const saveEditedArea = () => {
    if (!editingAreaId || !editName.trim() || duplicateEditName) return
    onUpdateArea(editingAreaId, {
      name: editName.trim(),
      type: editType,
    })
    cancelEditingArea()
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[#dfdfdf] bg-white">
      <div className="flex min-h-[72px] items-center justify-between gap-3 border-b border-[#e5e5e5] px-4">
        <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef4444]">SURFACE SETUP</p><h2 className="mt-1 text-sm font-bold">Define surface areas</h2></div>
        <button type="button" disabled={areaLimitReached || isAddingArea} onClick={onStartAdd} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#ef4444] px-3 py-2 text-[9px] font-semibold text-[#ef4444] transition hover:bg-[#ef4444] hover:text-white disabled:cursor-not-allowed disabled:border-[#d5d5d5] disabled:bg-[#f4f4f4] disabled:text-[#aaa]"><Icon name="points" size={14} /> Add area</button>
      </div>

      {isAddingArea && (
        <div className="border-b border-[#e7e7e7] bg-[#fff8f7] p-3">
          <div className="rounded-xl border border-[#ffc8c4] bg-white p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white">{pendingArea ? '✓' : '1'}</span>
              <div><strong className="block text-[10px]">{pendingArea ? 'Area position selected' : 'Click a position on the room'}</strong><small className="mt-1 block text-[8px] leading-4 text-[#888]">{pendingArea ? 'Set a name and surface type, then save.' : 'The marker will use the name entered below.'}</small></div>
            </div>

            <label className="mt-3 block text-[8px] font-bold uppercase tracking-[0.08em] text-[#666]">Name
              <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={30} aria-invalid={duplicateName} aria-describedby={duplicateName ? 'area-name-error' : undefined} className={`mt-1.5 h-9 w-full rounded-lg border px-3 text-[10px] font-medium normal-case tracking-normal text-[#333] outline-none ${duplicateName ? 'border-[#ef4444] bg-[#fff8f7]' : 'border-[#ddd] focus:border-[#ef4444]'}`} />
            </label>
            {duplicateName && <p id="area-name-error" className="mt-1.5 text-[8px] font-semibold normal-case tracking-normal text-[#ef4444]">This area name is already in use.</p>}

            <label className="mt-3 block text-[8px] font-bold uppercase tracking-[0.08em] text-[#666]">Type
              <select value={draftType} onChange={(event) => setDraftType(event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-[#ddd] bg-white px-3 text-[10px] font-medium normal-case tracking-normal text-[#333] outline-none focus:border-[#ef4444]"><option value="Wall">Wall</option><option value="Floor">Floor</option></select>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={onCancelAdd} className="h-9 rounded-lg border border-[#ddd] text-[9px] font-semibold text-[#666] hover:bg-[#f5f5f5]">Cancel</button>
              <button type="button" disabled={!pendingArea || !draftName.trim() || duplicateName} onClick={onSaveArea} className="h-9 rounded-lg bg-[#ef4444] text-[9px] font-bold text-white hover:bg-[#dc3838] disabled:cursor-not-allowed disabled:bg-[#d8d8d8]">Save area</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 border-b border-[#e8e8e8] p-3">
        {['All', 'Floor', 'Wall'].map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-semibold ${filter === item ? 'bg-[#ef4444] text-white' : 'text-[#777] hover:bg-[#f5f5f5]'}`}>{item === 'Floor' && <Icon name="grid" size={14} />}{item === 'Wall' && <Icon name="wall" size={14} />}{item}</button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleAreas.length === 0 && !isAddingArea && <div className="px-6 py-10 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-[#f3f3f3] text-[#999]"><Icon name="points" size={20} /></span><strong className="mt-3 block text-[10px]">No areas yet</strong><p className="mt-1 text-[8px] leading-4 text-[#999]">Click Add area to mark your first wall or floor.</p></div>}
        {visibleAreas.map((area) => {
          const selected = activeAreaId === area.id
          const areaPoints = pointsByArea[area.id] || []
          const selectedProduct = selectedProductsByArea[area.id]
          const adjustment = textureAdjustmentsByArea[area.id] || DEFAULT_TEXTURE_ADJUSTMENT
          const maskReady = maskStates[area.id]?.status === 'success'

          return (
            <div key={area.id} className={`border-b border-[#ededed] ${selected ? 'bg-[#fff0ef]' : 'bg-white hover:bg-[#fafafa]'}`}>
              <div className="grid min-h-[92px] grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 p-3">
                <button type="button" onClick={() => onSelectArea(area)} className={`relative grid size-14 overflow-hidden rounded-sm text-white ${selectedProduct ? 'border border-[#ddd] bg-white' : selected ? 'place-items-center bg-[#ef4444]' : 'place-items-center bg-[#333]'}`}>
                  {selectedProduct ? <><img src={selectedProduct.src} alt={selectedProduct.name} className="size-full object-cover" /><span className="absolute bottom-0.5 right-0.5 grid size-4 place-items-center rounded bg-[#242424]/85 text-[7px] font-bold text-white">{areas.indexOf(area) + 1}</span></> : <strong className="text-[11px]">{String(areas.indexOf(area) + 1).padStart(2, '0')}</strong>}
                </button>
                <div className="min-w-0 self-stretch py-0.5">
                  <button type="button" onClick={() => onSelectArea(area)} className="block w-full min-w-0 text-left"><strong className="block truncate text-[11px]">{area.name}</strong><small className="mt-1 flex items-center gap-1 text-[8px] text-[#999]"><Icon name={area.type === 'Wall' ? 'wall' : 'grid'} size={11} /> {area.type} · {areaPoints.length}/4</small></button>
                  <div className="mt-1.5 flex items-center gap-0.5">
                    <button type="button" onClick={() => onDeleteArea(area.id)} className="grid size-6 place-items-center rounded text-[#888] transition hover:bg-white hover:text-[#ef4444]" aria-label={`Delete ${area.name}`} title="Delete area"><Icon name="trash" size={13} /></button>
                    <button type="button" onClick={() => startEditingArea(area)} className={`grid size-6 place-items-center rounded transition ${editingAreaId === area.id ? 'bg-white text-[#ef4444]' : 'text-[#888] hover:bg-white hover:text-[#ef4444]'}`} aria-label={`Edit ${area.name}`} title="Edit area"><Icon name="edit" size={13} /></button>
                    <button type="button" disabled={!maskReady || areaPoints.length === 4} onClick={() => onStartPoints(area)} className={`grid size-6 place-items-center rounded transition disabled:cursor-not-allowed disabled:opacity-25 ${selected && pointMode ? 'bg-[#ef4444] text-white' : 'text-[#888] hover:bg-white hover:text-[#ef4444]'}`} aria-label={`Add points for ${area.name}`} title="Add points"><Icon name="points" size={13} /></button>
                    <button type="button" disabled={areaPoints.length === 0} onClick={() => onResetPoints(area)} className="grid size-6 place-items-center rounded text-[#888] transition hover:bg-white hover:text-[#ef4444] disabled:cursor-not-allowed disabled:opacity-25" aria-label={`Reset points for ${area.name}`} title="Reset points"><Icon name="reset" size={13} /></button>
                  </div>
                  {maskStates[area.id]?.status === 'loading' && <small className="mt-1 block truncate text-[7px] font-semibold text-[#ef4444]">Generating mask…</small>}
                  {maskReady && <small className="mt-1 block truncate text-[7px] font-semibold text-[#568638]">{selectedProduct ? `${selectedProduct.name} applied` : 'Mask ready'}</small>}
                  {maskStates[area.id]?.status === 'error' && <small className="mt-1 block truncate text-[7px] font-semibold text-[#ef4444]" title={maskStates[area.id].error}>Mask failed</small>}
                </div>
                <button type="button" disabled={areaPoints.length !== 4} onClick={() => onOpenProducts(area)} className={`min-w-[82px] rounded-full px-3 py-2 text-[8px] font-semibold transition disabled:cursor-not-allowed disabled:bg-[#eee] disabled:text-[#aaa] ${selectedProduct ? 'bg-[#f0e5e4] text-[#777] hover:bg-[#eadad8]' : 'bg-black text-white hover:bg-[#222]'}`}>{selectedProduct ? 'Change product' : '+ Select product'}</button>
              </div>
              {editingAreaId === area.id && (
                <div className="border-t border-[#f1cfcc] bg-[#fff8f7] px-3 pb-3 pt-3">
                  <form
                    onSubmit={(event) => { event.preventDefault(); saveEditedArea() }}
                    onKeyDown={(event) => { if (event.key === 'Escape') cancelEditingArea() }}
                    className="overflow-hidden rounded-xl border border-[#f0d4d1] bg-white shadow-[0_8px_22px_rgba(63,31,28,0.08)]"
                  >
                    <div className="flex items-center gap-2.5 border-b border-[#f2e5e3] bg-[linear-gradient(135deg,#fff7f6,#fff)] px-3 py-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#ef4444] text-white shadow-[0_4px_10px_rgba(239,68,68,0.25)]"><Icon name="edit" size={13} /></span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-[10px] text-[#292929]">Edit surface area</strong>
                        <small className="mt-0.5 block truncate text-[7px] text-[#999]">Update the display name and surface type.</small>
                      </span>
                      <button type="button" onClick={cancelEditingArea} className="grid size-6 place-items-center rounded-full text-[15px] leading-none text-[#999] transition hover:bg-[#f5e8e7] hover:text-[#ef4444]" aria-label="Close edit form" title="Close">×</button>
                    </div>

                    <div className="space-y-3 p-3">
                      <label className="block text-[7px] font-bold uppercase tracking-[0.1em] text-[#777]">Area name
                        <span className={`mt-1.5 flex h-9 items-center rounded-lg border bg-[#fafafa] px-2.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ef4444]/10 ${duplicateEditName ? 'border-[#ef4444]' : 'border-[#dedede] focus-within:border-[#ef4444]'}`}>
                          <Icon name="edit" size={12} />
                          <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={30} aria-invalid={duplicateEditName} autoFocus className="ml-2 min-w-0 flex-1 border-0 bg-transparent text-[9px] font-semibold normal-case tracking-normal text-[#333] outline-none" />
                          <span className="ml-2 text-[7px] font-medium normal-case tracking-normal text-[#aaa]">{editName.length}/30</span>
                        </span>
                      </label>
                      {duplicateEditName && <p className="-mt-1.5 flex items-center gap-1 text-[8px] font-semibold text-[#ef4444]"><span className="grid size-3.5 place-items-center rounded-full bg-[#ef4444] text-[7px] text-white">!</span>This area name is already in use.</p>}

                      <fieldset>
                        <legend className="text-[7px] font-bold uppercase tracking-[0.1em] text-[#777]">Surface type</legend>
                        <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-[#f3f3f3] p-1">
                          {['Wall', 'Floor'].map((type) => (
                            <button key={type} type="button" onClick={() => setEditType(type)} className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-[8px] font-semibold transition ${editType === type ? 'bg-white text-[#ef4444] shadow-sm ring-1 ring-black/5' : 'text-[#777] hover:text-[#333]'}`} aria-pressed={editType === type}>
                              <Icon name={type === 'Wall' ? 'wall' : 'grid'} size={12} /> {type}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <div className="flex items-center justify-between gap-3 border-t border-[#eee] pt-3">
                        <small className="max-w-[112px] text-[7px] leading-3 text-[#aaa]">Mask, points and product will stay unchanged.</small>
                        <span className="flex shrink-0 gap-1.5">
                          <button type="button" onClick={cancelEditingArea} className="h-8 rounded-lg border border-[#ddd] bg-white px-3 text-[8px] font-semibold text-[#666] transition hover:border-[#bbb] hover:bg-[#f7f7f7]">Cancel</button>
                          <button type="submit" disabled={!editName.trim() || duplicateEditName} className="flex h-8 items-center gap-1.5 rounded-lg bg-[#ef4444] px-3.5 text-[8px] font-bold text-white shadow-[0_5px_12px_rgba(239,68,68,0.22)] transition hover:bg-[#dc3838] disabled:cursor-not-allowed disabled:bg-[#d8d8d8] disabled:shadow-none"><span>Save changes</span><span aria-hidden="true">✓</span></button>
                        </span>
                      </div>
                    </div>
                  </form>
                </div>
              )}
              {selected && selectedProduct && areaPoints.length === 4 && (
                <div className="border-t border-[#f1cfcc] px-3 pb-3 pt-2.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div>
                      <strong className="block text-[9px]">Texture adjustment</strong>
                      <small className="mt-0.5 block text-[7px] text-[#999]">Adjust only {area.name}</small>
                    </div>
                    <button type="button" onClick={() => onResetTextureAdjustment(area)} className="grid size-6 place-items-center rounded text-[#888] hover:bg-white hover:text-[#ef4444]" aria-label={`Reset texture adjustment for ${area.name}`} title="Reset texture adjustment"><Icon name="reset" size={13} /></button>
                  </div>
                  <div className="grid gap-2.5 rounded-lg border border-[#ecd8d6] bg-white/80 p-2.5">
                    <TextureSlider label="Scale" value={adjustment.scale} displayValue={`${Math.round(adjustment.scale * 100)}%`} min={0.1} max={2} step={0.05} onChange={(value) => onTextureAdjustmentChange(area, 'scale', value)} />
                    <TextureSlider label="Rotate" value={adjustment.rotation} displayValue={`${adjustment.rotation}°`} min={-180} max={180} step={1} onChange={(value) => onTextureAdjustmentChange(area, 'rotation', value)} />
                    <TextureSlider label="Move X" value={adjustment.offsetX} displayValue={`${adjustment.offsetX}%`} min={-100} max={100} step={1} onChange={(value) => onTextureAdjustmentChange(area, 'offsetX', value)} />
                    <TextureSlider label="Move Y" value={adjustment.offsetY} displayValue={`${adjustment.offsetY}%`} min={-100} max={100} step={1} onChange={(value) => onTextureAdjustmentChange(area, 'offsetY', value)} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="m-4 rounded-xl bg-[#f5f5f5] p-3 text-[9px] leading-4 text-[#777]"><span className="flex items-center justify-between"><strong className="text-[#333]">Surface areas</strong><b className="text-[#ef4444]">{areas.length}/6</b></span><span className="mt-1 block">Choose an area in the panel or directly on the image.</span></div>
    </aside>
  )
}

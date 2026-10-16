import { useEffect, useRef, useState } from 'react'
import cvModule from '@techstark/opencv-js'

import diningRoom from './assets/img/rooms/samplediningroom2.png'
import diningRoomWide from './assets/img/rooms/samplediningroom.png'
import livingRoom from './assets/img/rooms/simplelivingroom.jpg'
import livingRoomSoft from './assets/img/rooms/simplelivingroom2.png'
import bedroom from './assets/img/rooms/simplebedroom.jpg'
import kitchen from './assets/img/rooms/simplekitchen.jpg'
import tile01 from './assets/img/tiles/2000000600727 Tile.jpg'
import tile02 from './assets/img/tiles/2000000591766 Tile.jpg'
import tile03 from './assets/img/tiles/2000000503004 Tile.jpg'
import tile04 from './assets/img/tiles/2000000432168 Tile.jpg'
import tile05 from './assets/img/tiles/2000000443478 Tile.jpg'
import tile06 from './assets/img/tiles/2000000602547 Tile.jpg'

const ROOMS = [
  { id: 'living-sun', name: 'Sunlit living room', category: 'Living', src: livingRoom },
  { id: 'living-soft', name: 'Soft living room', category: 'Living', src: livingRoomSoft },
  { id: 'bedroom-calm', name: 'Calm bedroom', category: 'Bedroom', src: bedroom },
  { id: 'kitchen-modern', name: 'Modern kitchen', category: 'Kitchen', src: kitchen },
  { id: 'dining-warm', name: 'Warm dining room', category: 'Dining', src: diningRoom },
  { id: 'dining-airy', name: 'Airy dining room', category: 'Dining', src: diningRoomWide },
]

const PRODUCTS = [
  { id: 'ivory', name: 'Ivory Vein', sku: '600727', size: '600 × 1200 mm', src: tile01, badge: 'New' },
  { id: 'cloud', name: 'Cloud Marble', sku: '591766', size: '600 × 1200 mm', src: tile02, badge: 'Popular' },
  { id: 'sand', name: 'Warm Sand', sku: '503004', size: '600 × 600 mm', src: tile03 },
  { id: 'terrazzo', name: 'Soft Terrazzo', sku: '432168', size: '600 × 600 mm', src: tile04 },
  { id: 'travertine', name: 'Travertine', sku: '443478', size: '600 × 1200 mm', src: tile05, badge: 'Popular' },
  { id: 'pearl', name: 'Pearl Stone', sku: '602547', size: '600 × 600 mm', src: tile06 },
]

const normalizeAreaName = (name) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

let openCvPromise

function getOpenCv() {
  if (openCvPromise) return openCvPromise
  openCvPromise = (async () => {
    if (cvModule instanceof Promise) return cvModule
    if (cvModule.Mat) return cvModule

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('OpenCV is taking too long to start.')),
        20000,
      )
      cvModule.onRuntimeInitialized = () => {
        window.clearTimeout(timeout)
        resolve(cvModule)
      }
    })
  })()
  return openCvPromise
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be opened.'))
    image.src = source
  })
}

function orderPoints(points) {
  const center = points.reduce(
    (total, point) => ({ x: total.x + point.x / 4, y: total.y + point.y / 4 }),
    { x: 0, y: 0 },
  )
  const clockwise = [...points].sort(
    (first, second) => (
      Math.atan2(first.y - center.y, first.x - center.x)
      - Math.atan2(second.y - center.y, second.x - center.x)
    ),
  )
  const topLeftIndex = clockwise.reduce(
    (bestIndex, point, index) => (
      point.x + point.y < clockwise[bestIndex].x + clockwise[bestIndex].y
        ? index
        : bestIndex
    ),
    0,
  )
  return [...clockwise.slice(topLeftIndex), ...clockwise.slice(0, topLeftIndex)]
}

const distance = (first, second) => Math.hypot(second.x - first.x, second.y - first.y)

function colorizeMask(source) {
  return new Promise((resolve, reject) => {
    const maskImage = new Image()

    maskImage.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = maskImage.naturalWidth
        canvas.height = maskImage.naturalHeight
        const context = canvas.getContext('2d', { willReadFrequently: true })

        context.drawImage(maskImage, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

        for (let index = 0; index < imageData.data.length; index += 4) {
          const isSelected = imageData.data[index] > 127
          imageData.data[index] = 239
          imageData.data[index + 1] = 68
          imageData.data[index + 2] = 68
          imageData.data[index + 3] = isSelected ? 92 : 0
        }

        context.putImageData(imageData, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Mask overlay could not be created.'))
        }, 'image/png')
      } catch (error) {
        reject(error)
      }
    }

    maskImage.onerror = () => reject(new Error('Mask image could not be opened.'))
    maskImage.src = source
  })
}

function Icon({ name, size = 19 }) {
  const paths = {
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    compare: <><path d="M8 5 4 9l4 4M4 9h8M16 19l4-4-4-4m4 4h-8" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 19h14" /></>,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    points: <><path d="M6 6h12v12H6z" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><circle cx="6" cy="18" r="2" /></>,
    products: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    wall: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 10h18M9 4v6m6 0v10M3 15h12" /></>,
    grid: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 4v16M4 12h16" /></>,
    adjust: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" /><path d="M5 14v5h14v-5" /></>,
    reset: <><path d="M4.5 8A8 8 0 1 1 4 13" /><path d="M4 4v4h4" /></>,
    grout: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    layout: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M9 10h12" /></>,
    applied: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M17.5 14v7M14 17.5h7" /></>,
  }

  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Brand() {
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

function RoomLibrary({ onContinue }) {
  const uploadRef = useRef(null)
  const uploadedUrlRef = useRef(null)
  const [category, setCategory] = useState('All')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const categories = ['All', 'Living', 'Bedroom', 'Kitchen', 'Dining']
  const visibleRooms = category === 'All' ? ROOMS : ROOMS.filter((room) => room.category === category)

  useEffect(() => () => {
    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current)
  }, [])

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current)
    const src = URL.createObjectURL(file)
    uploadedUrlRef.current = src
    setSelectedRoom({ id: 'uploaded-room', name: file.name, category: 'Your upload', src, file, uploaded: true })
    event.target.value = ''
  }

  const continueWithRoom = () => {
    if (!selectedRoom) return
    if (selectedRoom.file) {
      onContinue({
        ...selectedRoom,
        src: URL.createObjectURL(selectedRoom.file),
        workspaceObjectUrl: true,
      })
      return
    }
    onContinue(selectedRoom)
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans text-[#242424]">
      <header className="grid h-[72px] grid-cols-[1fr_auto_1fr] items-center border-t-[5px] border-[#333] border-b border-[#e5e5e5] bg-white px-6 max-md:grid-cols-[1fr_auto]">
        <Brand />
        <div className="flex items-center gap-2 text-[11px] text-[#8a8a8a] max-md:hidden"><span className="grid size-7 place-items-center rounded-full bg-[#ef4444] font-bold text-white">1</span><span className="h-px w-20 bg-[#dedede]" /><span className="grid size-7 place-items-center rounded-full border border-[#dedede] bg-white font-bold">2</span><span className="ml-2">Choose room → Workspace</span></div>
        <button className="justify-self-end rounded-full bg-[#f1f1f1] px-4 py-2 text-xs text-[#666]">Exit</button>
      </header>

      <main className="grid min-h-[calc(100vh-72px)] grid-cols-[minmax(320px,380px)_minmax(0,1fr)] max-lg:grid-cols-[320px_minmax(0,1fr)] max-md:block">
        <aside className="border-r border-[#e4e4e4] bg-[#fcfcfc] px-8 py-10 max-md:border-r-0 max-md:border-b">
          <p className="text-[9px] font-extrabold tracking-[0.18em] text-[#ef4444]">START YOUR PROJECT</p>
          <h1 className="mt-3 max-w-[300px] text-[38px] font-bold leading-[1.05] tracking-[-0.055em]">{selectedRoom ? 'Review your room' : 'Make the space yours.'}</h1>
          <p className="mt-4 max-w-[305px] text-[12px] leading-5 text-[#777]">{selectedRoom ? 'Check the room before opening your workspace.' : 'Upload your own photo or begin with one of our ready-made spaces.'}</p>

          {selectedRoom ? (
            <div className="mt-7 overflow-hidden rounded-2xl border border-[#dedede] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
              <div className="relative aspect-[1.48] overflow-hidden bg-[#eee]"><img className="h-full w-full object-cover" src={selectedRoom.src} alt={selectedRoom.name} /><span className="absolute left-3 top-3 rounded-full bg-[#222]/80 px-3 py-1.5 text-[8px] text-white">{selectedRoom.uploaded ? 'Your upload' : 'Selected room'}</span></div>
              <div className="flex items-center justify-between gap-3 px-4 py-3"><span className="min-w-0"><small className="block text-[8px] text-[#999]">Selected room</small><strong className="mt-1 block truncate text-[11px]">{selectedRoom.name}</strong></span><button onClick={() => setSelectedRoom(null)} className="text-[9px] text-[#777]">Change</button></div>
              <button onClick={continueWithRoom} className="mx-3 mb-3 flex h-11 w-[calc(100%-24px)] items-center justify-center gap-2 rounded-xl bg-[#ef4444] text-[10px] font-bold text-white transition hover:bg-[#dc3838]">Continue to workspace <Icon name="arrow" size={15} /></button>
            </div>
          ) : (
            <button onClick={() => uploadRef.current?.click()} className="mt-7 flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd1d2] bg-white px-8 text-center transition hover:border-[#ef4444] hover:bg-[#fffafa]">
              <span className="grid size-14 place-items-center rounded-2xl bg-[#fff0ef] text-[#ef4444]"><Icon name="upload" size={25} /></span>
              <strong className="mt-5 text-xs">Upload your room</strong>
              <span className="mt-2 text-[9px] text-[#888]">Choose a clear JPG, PNG or WEBP image</span>
              <span className="mt-5 flex items-center gap-2 rounded-lg bg-[#ef4444] px-5 py-3 text-[9px] font-bold text-white"><Icon name="upload" size={14} /> Browse image</span>
            </button>
          )}

          <input ref={uploadRef} type="file" accept="image/*" onChange={handleUpload} className="sr-only" />

          <div className="mt-6 border-t border-[#e2e2e2] pt-5">
            <strong className="text-[9px] uppercase tracking-[0.1em]">For the best result</strong>
            <ul className="mt-3 space-y-2 text-[9px] text-[#777]"><li><span className="mr-2 text-[#ef4444]">●</span>Use a bright, clear room photo</li><li><span className="mr-2 text-[#ef4444]">●</span>Keep walls and floors visible</li><li><span className="mr-2 text-[#ef4444]">●</span>Avoid heavily cropped images</li></ul>
          </div>
        </aside>

        <section className="min-w-0 bg-white px-10 py-10 max-md:p-5">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-extrabold tracking-[0.18em] text-[#ef4444]">READY-MADE ROOMS</p><h2 className="mt-3 text-[25px] font-bold tracking-[-0.04em]">Or start with a styled space</h2></div><span className="text-[9px] text-[#888]">{visibleRooms.length} rooms</span></div>
          <div className="my-6 flex gap-2 overflow-x-auto">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-[11px] ${category === item ? 'bg-[#242424] text-white' : 'border border-[#ddd] bg-white text-[#666]'}`}>{item}</button>)}</div>
          <div className="grid grid-cols-3 gap-x-5 gap-y-7 max-xl:grid-cols-2 max-lg:grid-cols-1">
            {visibleRooms.map((room) => <button key={room.id} onClick={() => setSelectedRoom(room)} className={`group overflow-hidden rounded-xl border bg-white p-2 text-left transition ${selectedRoom?.id === room.id ? 'border-[#bfc1c2] shadow-[0_10px_28px_rgba(0,0,0,.09)]' : 'border-[#e1e1e1] hover:border-[#aaa]'}`}><span className="relative block aspect-[3/2] overflow-hidden rounded-lg"><img src={room.src} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />{selectedRoom?.id === room.id && <span className="absolute right-2 top-2 rounded-full bg-[#242424]/90 px-2 py-1 text-[8px] font-bold text-white">SELECTED</span>}</span><span className="block px-2 py-3"><strong className="block text-xs">{room.name}</strong><small className="mt-1 block text-[10px] text-[#888]">{room.category}</small></span></button>)}
          </div>
        </section>
      </main>
    </div>
  )
}

function ActivityButton({ active, icon, label, onClick, disabled = false }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`group relative grid h-14 w-full place-items-center transition disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'bg-white text-[#ef4444]' : 'text-[#8a8a8a] hover:bg-[#333] hover:text-white'}`} aria-label={label}>{active && <span className="absolute left-0 h-8 w-[3px] rounded-r bg-[#ef4444]" />}<Icon name={icon} size={21} /><span className="pointer-events-none absolute left-[58px] z-30 hidden whitespace-nowrap rounded bg-[#222] px-2 py-1 text-[9px] text-white shadow group-hover:block">{label}</span></button>
}

function PointsPanel({
  areas,
  activeAreaId,
  activeArea,
  activePoints,
  onSelectArea,
  maskStates,
  pointMode,
  onStartPoints,
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
  const visibleAreas = filter === 'All' ? areas : areas.filter((area) => area.type === filter)
  const areaLimitReached = areas.length >= 6
  const duplicateName = Boolean(draftName.trim()) && areas.some((area) => normalizeAreaName(area.name) === normalizeAreaName(draftName))

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[#dfdfdf] bg-white">
      <div className="flex min-h-[72px] items-center justify-between gap-3 border-b border-[#e5e5e5] px-4">
        <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef4444]">SURFACE SETUP</p><h2 className="mt-1 text-sm font-bold">Define surface areas</h2></div>
        <button
          type="button"
          disabled={areaLimitReached || isAddingArea}
          onClick={onStartAdd}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#ef4444] px-3 py-2 text-[9px] font-semibold text-[#ef4444] transition hover:bg-[#ef4444] hover:text-white disabled:cursor-not-allowed disabled:border-[#d5d5d5] disabled:bg-[#f4f4f4] disabled:text-[#aaa]"
        >
          <Icon name="points" size={14} /> Add area
        </button>
      </div>

      {isAddingArea && (
        <div className="border-b border-[#e7e7e7] bg-[#fff8f7] p-3">
          <div className="rounded-xl border border-[#ffc8c4] bg-white p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white">{pendingArea ? '✓' : '1'}</span>
              <div><strong className="block text-[10px]">{pendingArea ? 'Area position selected' : 'Click a position on the room'}</strong><small className="mt-1 block text-[8px] leading-4 text-[#888]">{pendingArea ? 'Set a name and surface type, then save.' : 'The marker will use the name entered below.'}</small></div>
            </div>

            <label className="mt-3 block text-[8px] font-bold uppercase tracking-[0.08em] text-[#666]">Name
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={30}
                aria-invalid={duplicateName}
                aria-describedby={duplicateName ? 'area-name-error' : undefined}
                className={`mt-1.5 h-9 w-full rounded-lg border px-3 text-[10px] font-medium normal-case tracking-normal text-[#333] outline-none ${duplicateName ? 'border-[#ef4444] bg-[#fff8f7]' : 'border-[#ddd] focus:border-[#ef4444]'}`}
              />
            </label>
            {duplicateName && <p id="area-name-error" className="mt-1.5 text-[8px] font-semibold normal-case tracking-normal text-[#ef4444]">This area name is already in use.</p>}

            <label className="mt-3 block text-[8px] font-bold uppercase tracking-[0.08em] text-[#666]">Type
              <select
                value={draftType}
                onChange={(event) => setDraftType(event.target.value)}
                className="mt-1.5 h-9 w-full rounded-lg border border-[#ddd] bg-white px-3 text-[10px] font-medium normal-case tracking-normal text-[#333] outline-none focus:border-[#ef4444]"
              >
                <option value="Wall">Wall</option>
                <option value="Floor">Floor</option>
              </select>
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
          <button key={item} type="button" onClick={() => setFilter(item)} className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-semibold ${filter === item ? 'bg-[#ef4444] text-white' : 'text-[#777] hover:bg-[#f5f5f5]'}`}>
            {item === 'Floor' && <Icon name="grid" size={14} />}{item === 'Wall' && <Icon name="wall" size={14} />}{item}
          </button>
        ))}
      </div>

      {activeArea && !isAddingArea && (
        <div className="border-b border-[#e8e8e8] bg-[#fafafa] p-3">
          <div className="rounded-xl border border-[#e1e1e1] bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <span><small className="block text-[8px] font-bold uppercase tracking-[0.08em] text-[#888]">Perspective setup</small><strong className="mt-1 block text-[10px]">{activePoints.length}/4 points added</strong></span>
              <span className={`grid size-8 place-items-center rounded-full text-[10px] font-bold ${activePoints.length === 4 ? 'bg-[#eaf5e4] text-[#568638]' : 'bg-[#fff0ef] text-[#ef4444]'}`}>{activePoints.length}</span>
            </div>
            <button
              type="button"
              disabled={maskStates[activeArea.id]?.status !== 'success'}
              onClick={onStartPoints}
              className={`mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[9px] font-bold transition disabled:cursor-not-allowed disabled:bg-[#e7e7e7] disabled:text-[#999] ${pointMode ? 'bg-[#242424] text-white' : 'bg-[#ef4444] text-white hover:bg-[#dc3838]'}`}
            >
              <Icon name="points" size={14} /> {pointMode ? `Click image · ${4 - activePoints.length} left` : activePoints.length === 4 ? 'Reset points' : activePoints.length ? 'Continue points' : 'Add points'}
            </button>
            <p className="mt-2 text-[8px] leading-4 text-[#888]">{maskStates[activeArea.id]?.status !== 'success' ? 'Wait until the area mask is ready.' : activePoints.length === 4 ? 'Product panel is now available.' : 'Place four corners on the room image.'}</p>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleAreas.length === 0 && !isAddingArea && (
          <div className="px-6 py-10 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-[#f3f3f3] text-[#999]"><Icon name="points" size={20} /></span><strong className="mt-3 block text-[10px]">No areas yet</strong><p className="mt-1 text-[8px] leading-4 text-[#999]">Click Add area to mark your first wall or floor.</p></div>
        )}
        {visibleAreas.map((area) => (
          <button key={area.id} type="button" onClick={() => onSelectArea(area)} className={`grid w-full grid-cols-[45px_1fr_auto] items-center gap-3 border-b border-[#ededed] p-3 text-left ${activeAreaId === area.id ? 'bg-[#fff0ef]' : 'hover:bg-[#fafafa]'}`}>
            <span className={`grid size-11 place-items-center rounded-lg text-white ${activeAreaId === area.id ? 'bg-[#ef4444]' : 'bg-[#333]'}`}><strong className="text-[11px]">{String(areas.indexOf(area) + 1).padStart(2, '0')}</strong></span>
            <span className="min-w-0"><strong className="block truncate text-[11px]">{area.name}</strong><small className="mt-1 flex items-center gap-1 text-[9px] text-[#999]"><Icon name={area.type === 'Wall' ? 'wall' : 'grid'} size={12} /> {area.type}</small>{maskStates[area.id]?.status === 'loading' && <small className="mt-1 block text-[8px] font-semibold text-[#ef4444]">Generating mask…</small>}{maskStates[area.id]?.status === 'success' && <small className="mt-1 block text-[8px] font-semibold text-[#568638]">Mask ready</small>}{maskStates[area.id]?.status === 'error' && <small className="mt-1 block truncate text-[8px] font-semibold text-[#ef4444]" title={maskStates[area.id].error}>Mask failed</small>}</span>
            <span className={`rounded-full px-2 py-1 text-[8px] font-bold text-white ${activeAreaId === area.id ? 'bg-[#ef4444]' : 'bg-[#242424]'}`}>{activeAreaId === area.id ? 'Selected' : `#${areas.indexOf(area) + 1}`}</span>
          </button>
        ))}
      </div>
      <div className="m-4 rounded-xl bg-[#f5f5f5] p-3 text-[9px] leading-4 text-[#777]"><span className="flex items-center justify-between"><strong className="text-[#333]">Surface areas</strong><b className="text-[#ef4444]">{areas.length}/6</b></span><span className="mt-1 block">Choose an area in the panel or directly on the image.</span></div>
    </aside>
  )
}

function ProductsPanel({ selectedProduct, onSelectProduct, isApplying, activeArea, applyError }) {
  const [query, setQuery] = useState('')
  const visible = PRODUCTS.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[#dfdfdf] bg-white">
      <div className="border-b border-[#e5e5e5] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef4444]">PRODUCTS</p><h2 className="mt-1 text-sm font-bold">Choose a product</h2><p className="mt-1 text-[8px] text-[#888]">Applying to {activeArea?.name}</p><label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-[#ddd] px-3 text-[#888] focus-within:border-[#ef4444]"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="min-w-0 flex-1 border-0 bg-transparent text-[10px] text-[#333] outline-none" /></label>{applyError && <p className="mt-2 rounded-lg bg-[#fff0ef] px-3 py-2 text-[8px] font-semibold leading-4 text-[#ef4444]">{applyError}</p>}</div>
      <div className="flex gap-2 border-b border-[#e8e8e8] p-3"><button className="rounded-full bg-[#242424] px-3 py-1.5 text-[9px] text-white">All</button><button className="rounded-full border border-[#ddd] px-3 py-1.5 text-[9px] text-[#666]">Wall</button><button className="rounded-full border border-[#ddd] px-3 py-1.5 text-[9px] text-[#666]">Floor</button></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visible.map((product) => <button key={product.id} type="button" disabled={isApplying} onClick={() => onSelectProduct(product)} className={`grid w-full grid-cols-[70px_1fr] gap-3 rounded-xl border bg-white p-2 text-left transition disabled:cursor-wait disabled:opacity-60 ${selectedProduct?.id === product.id ? 'border-[#ef4444] shadow-[0_5px_16px_rgba(0,0,0,.08)]' : 'border-[#dedede] hover:border-[#aaa]'}`}><img src={product.src} alt="" className="size-[70px] rounded-lg border border-[#eee] object-cover" /><span className="min-w-0 py-1"><span className="flex items-start justify-between gap-2"><strong className="truncate text-[10px] uppercase">{product.name}</strong>{selectedProduct?.id === product.id && <i className="grid size-4 shrink-0 place-items-center rounded-full bg-[#ef4444] text-[9px] not-italic text-white">✓</i>}</span><small className="mt-1 block text-[9px] text-[#777]">SKU: {product.sku}</small><small className="block text-[9px] text-[#777]">{product.size}</small>{product.badge && <em className="mt-2 inline-block rounded bg-[#242424] px-1.5 py-0.5 text-[7px] not-italic text-white">{product.badge}</em>}{isApplying && selectedProduct?.id === product.id && <small className="mt-2 block text-[8px] font-semibold text-[#ef4444]">Applying perspective…</small>}</span></button>)}
      </div>
    </aside>
  )
}

function Workspace({ room, onChangeRoom }) {
  const roomImageRef = useRef(null)
  const tileCanvasRef = useRef(null)
  const dragPointRef = useRef(null)
  const roomFileRef = useRef(null)
  const maskRequestRef = useRef(null)
  const maskObjectUrlsRef = useRef(new Set())
  const [panel, setPanel] = useState('points')
  const [areas, setAreas] = useState([])
  const [activeAreaId, setActiveAreaId] = useState(null)
  const [maskStates, setMaskStates] = useState({})
  const [pointsByArea, setPointsByArea] = useState({})
  const [roomImageSize, setRoomImageSize] = useState({ width: 3, height: 2 })
  const [isAddingArea, setIsAddingArea] = useState(false)
  const [pointMode, setPointMode] = useState(false)
  const [pendingArea, setPendingArea] = useState(null)
  const [draftName, setDraftName] = useState('Area 01')
  const [draftType, setDraftType] = useState('Wall')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isApplying, setIsApplying] = useState(false)
  const [tileAppliedAreaId, setTileAppliedAreaId] = useState(null)
  const [applyError, setApplyError] = useState('')

  useEffect(() => () => {
    maskRequestRef.current?.controller.abort()
    maskObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    if (room.workspaceObjectUrl) URL.revokeObjectURL(room.src)
  }, [room.src, room.workspaceObjectUrl])

  const getRoomFile = async () => {
    if (room.file) return room.file
    if (!roomFileRef.current) {
      roomFileRef.current = fetch(room.src).then(async (response) => {
        if (!response.ok) throw new Error('Room image could not be prepared for the mask API.')
        const blob = await response.blob()
        return new File([blob], `${room.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'room'}.jpg`, {
          type: blob.type || 'image/jpeg',
        })
      })
    }
    return roomFileRef.current
  }

  const trackMaskUrl = (blob) => {
    const url = URL.createObjectURL(blob)
    maskObjectUrlsRef.current.add(url)
    return url
  }

  const requestMaskForArea = async (area) => {
    const currentRequest = maskRequestRef.current
    if (currentRequest?.areaId === area.id) return
    currentRequest?.controller.abort()
    if (maskStates[area.id]?.status === 'success') return

    const controller = new AbortController()
    maskRequestRef.current = { areaId: area.id, controller }
    setMaskStates((current) => ({
      ...current,
      [area.id]: { status: 'loading', url: '', error: '' },
    }))

    try {
      const image = roomImageRef.current
      if (!image?.naturalWidth || !image?.naturalHeight) {
        throw new Error('Room image is not ready yet.')
      }

      const x = Math.max(0, Math.min(image.naturalWidth - 1, Math.floor((area.x / 100) * image.naturalWidth)))
      const y = Math.max(0, Math.min(image.naturalHeight - 1, Math.floor((area.y / 100) * image.naturalHeight)))
      const imageFile = await getRoomFile()
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('x', String(x))
      formData.append('y', String(y))

      const response = await fetch(import.meta.env.VITE_MASK_API_URL || '/api/mask', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        let message = `Mask API error (${response.status})`
        try {
          const body = await response.json()
          message = body.detail || body.message || message
        } catch {
          // Keep the status-based error when the response is not JSON.
        }
        throw new Error(message)
      }

      const contentType = response.headers.get('content-type') || ''
      let overlayUrl = ''
      let maskSource = ''

      if (contentType.includes('application/json')) {
        const data = await response.json()
        const imageUrl = data.mask_url || data.image_url || data.url
        maskSource = data.mask
          ? (data.mask.startsWith('data:') ? data.mask : `data:image/png;base64,${data.mask}`)
          : imageUrl

        if (!maskSource) throw new Error('Mask API did not return a mask image.')

        try {
          const overlayBlob = await colorizeMask(maskSource)
          overlayUrl = trackMaskUrl(overlayBlob)
        } catch (overlayError) {
          if (!imageUrl) throw overlayError
          overlayUrl = imageUrl
        }
      } else {
        const maskBlob = await response.blob()
        const rawMaskUrl = trackMaskUrl(maskBlob)
        maskSource = rawMaskUrl
        try {
          const overlayBlob = await colorizeMask(rawMaskUrl)
          overlayUrl = trackMaskUrl(overlayBlob)
        } catch {
          overlayUrl = rawMaskUrl
        }
      }

      setMaskStates((current) => ({
        ...current,
        [area.id]: { status: 'success', url: overlayUrl, maskSource, error: '', x, y },
      }))
    } catch (requestError) {
      if (requestError.name === 'AbortError') {
        setMaskStates((current) => ({
          ...current,
          [area.id]: { status: 'idle', url: '', error: '' },
        }))
        return
      }
      setMaskStates((current) => ({
        ...current,
        [area.id]: { status: 'error', url: '', error: requestError.message || 'Mask could not be created.' },
      }))
    } finally {
      if (maskRequestRef.current?.controller === controller) maskRequestRef.current = null
    }
  }

  const clearTilePreview = () => {
    const canvas = tileCanvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setTileAppliedAreaId(null)
    setApplyError('')
  }

  const getPerspectivePoint = (clientX, clientY) => {
    const image = roomImageRef.current
    if (!image) return null
    const bounds = image.getBoundingClientRect()
    if (
      clientX < bounds.left
      || clientX > bounds.right
      || clientY < bounds.top
      || clientY > bounds.bottom
    ) return null

    const left = (clientX - bounds.left) / bounds.width
    const top = (clientY - bounds.top) / bounds.height
    return {
      x: Math.round(left * image.naturalWidth),
      y: Math.round(top * image.naturalHeight),
      left: left * 100,
      top: top * 100,
    }
  }

  const selectArea = (area) => {
    clearTilePreview()
    setPointMode(false)
    setSelectedProduct(null)
    setPanel('points')
    setActiveAreaId(area.id)
    requestMaskForArea(area)
  }

  const startAddingPoints = () => {
    if (!activeAreaId || maskStates[activeAreaId]?.status !== 'success') return
    const currentPoints = pointsByArea[activeAreaId] || []
    if (currentPoints.length === 4) {
      setPointsByArea((current) => ({ ...current, [activeAreaId]: [] }))
    }
    clearTilePreview()
    setSelectedProduct(null)
    setPointMode(true)
  }

  const startAddingArea = () => {
    if (areas.length >= 6) return
    clearTilePreview()
    setPointMode(false)
    setSelectedProduct(null)
    setPanel('points')
    setIsAddingArea(true)
    setActiveAreaId(null)
    setPendingArea(null)
    setDraftName(`Area ${String(areas.length + 1).padStart(2, '0')}`)
    setDraftType('Wall')
  }

  const cancelAddingArea = () => {
    setIsAddingArea(false)
    setPendingArea(null)
  }

  const handleRoomClick = (event) => {
    if (pointMode && activeAreaId) {
      const nextPoint = getPerspectivePoint(event.clientX, event.clientY)
      if (!nextPoint) return
      const currentPoints = pointsByArea[activeAreaId] || []
      if (currentPoints.length >= 4) return
      const nextPoints = [...currentPoints, nextPoint]
      const completedPoints = nextPoints.length === 4 ? orderPoints(nextPoints) : nextPoints
      setPointsByArea((current) => ({ ...current, [activeAreaId]: completedPoints }))
      if (completedPoints.length === 4) setPointMode(false)
      clearTilePreview()
      return
    }

    if (!isAddingArea) return
    const image = roomImageRef.current
    if (!image) return
    const bounds = image.getBoundingClientRect()
    if (
      event.clientX < bounds.left
      || event.clientX > bounds.right
      || event.clientY < bounds.top
      || event.clientY > bounds.bottom
    ) return
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100
    setPendingArea({ x, y })
  }

  const handlePerspectivePointDown = (index, event) => {
    event.stopPropagation()
    if (!activeAreaId) return
    clearTilePreview()
    setSelectedProduct(null)
    dragPointRef.current = { areaId: activeAreaId, index }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePerspectivePointMove = (event) => {
    const dragging = dragPointRef.current
    if (!dragging) return
    event.stopPropagation()
    const nextPoint = getPerspectivePoint(event.clientX, event.clientY)
    if (!nextPoint) return
    setPointsByArea((current) => ({
      ...current,
      [dragging.areaId]: (current[dragging.areaId] || []).map((point, index) => (
        index === dragging.index ? nextPoint : point
      )),
    }))
  }

  const handlePerspectivePointUp = (event) => {
    const dragging = dragPointRef.current
    if (!dragging) return
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragPointRef.current = null
    setPointsByArea((current) => ({
      ...current,
      [dragging.areaId]: (current[dragging.areaId] || []).length === 4
        ? orderPoints(current[dragging.areaId])
        : (current[dragging.areaId] || []),
    }))
  }

  const saveArea = () => {
    const duplicateName = areas.some((area) => normalizeAreaName(area.name) === normalizeAreaName(draftName))
    if (!pendingArea || !draftName.trim() || duplicateName || areas.length >= 6) return
    const nextArea = {
      id: `area-${Date.now()}`,
      name: draftName.trim(),
      type: draftType,
      x: pendingArea.x,
      y: pendingArea.y,
    }
    setAreas((currentAreas) => [...currentAreas, nextArea])
    setIsAddingArea(false)
    setPendingArea(null)
    selectArea(nextArea)
  }

  const applyProduct = async (product) => {
    const points = activeAreaId ? pointsByArea[activeAreaId] || [] : []
    const maskSource = activeAreaId ? maskStates[activeAreaId]?.maskSource : ''
    if (!activeAreaId || points.length !== 4 || !maskSource) {
      setApplyError('Select an area and add four points before choosing a product.')
      return
    }

    setSelectedProduct(product)
    setIsApplying(true)
    setApplyError('')

    let tileMat
    let warpedMat
    let sourcePoints
    let destinationPoints
    let transform

    try {
      const [cv, tileImage, maskImage] = await Promise.all([
        getOpenCv(),
        loadImage(product.src),
        loadImage(maskSource),
      ])
      const image = roomImageRef.current
      const canvas = tileCanvasRef.current
      if (!image || !canvas) throw new Error('Room preview is not ready.')

      const width = image.naturalWidth
      const height = image.naturalHeight
      const [topLeft, topRight, bottomRight, bottomLeft] = orderPoints(points)
      const textureWidth = Math.max(240, Math.round(
        (distance(topLeft, topRight) + distance(bottomLeft, bottomRight)) / 2,
      ))
      const textureHeight = Math.max(240, Math.round(
        (distance(topLeft, bottomLeft) + distance(topRight, bottomRight)) / 2,
      ))
      const textureCanvas = document.createElement('canvas')
      textureCanvas.width = textureWidth
      textureCanvas.height = textureHeight
      const textureContext = textureCanvas.getContext('2d')
      const tileSize = 120
      const tileRatio = tileImage.naturalWidth / tileImage.naturalHeight
      const cellWidth = tileSize
      const cellHeight = tileSize / tileRatio
      const grout = 3

      textureContext.fillStyle = '#dedbd2'
      textureContext.fillRect(0, 0, textureWidth, textureHeight)
      for (let y = 0; y < textureHeight; y += cellHeight) {
        for (let x = 0; x < textureWidth; x += cellWidth) {
          textureContext.drawImage(
            tileImage,
            x + grout,
            y + grout,
            cellWidth - grout * 2,
            cellHeight - grout * 2,
          )
        }
      }

      tileMat = cv.imread(textureCanvas)
      warpedMat = cv.Mat.zeros(height, width, cv.CV_8UC4)
      sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        textureWidth - 1, 0,
        textureWidth - 1, textureHeight - 1,
        0, textureHeight - 1,
      ])
      destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        topLeft.x, topLeft.y,
        topRight.x, topRight.y,
        bottomRight.x, bottomRight.y,
        bottomLeft.x, bottomLeft.y,
      ])
      transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints)
      cv.warpPerspective(
        tileMat,
        warpedMat,
        transform,
        new cv.Size(width, height),
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar(0, 0, 0, 0),
      )
      cv.imshow(canvas, warpedMat)

      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = width
      maskCanvas.height = height
      const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })
      maskContext.drawImage(maskImage, 0, 0, width, height)
      const maskPixels = maskContext.getImageData(0, 0, width, height)
      for (let index = 0; index < maskPixels.data.length; index += 4) {
        const isInsideMask = maskPixels.data[index] > 127
        maskPixels.data[index] = 255
        maskPixels.data[index + 1] = 255
        maskPixels.data[index + 2] = 255
        maskPixels.data[index + 3] = isInsideMask ? 255 : 0
      }
      maskContext.putImageData(maskPixels, 0, 0)

      const outputContext = canvas.getContext('2d')
      outputContext.globalCompositeOperation = 'destination-in'
      outputContext.drawImage(maskCanvas, 0, 0)
      outputContext.globalCompositeOperation = 'source-over'

      setPointsByArea((current) => ({
        ...current,
        [activeAreaId]: [topLeft, topRight, bottomRight, bottomLeft].map((point) => ({
          ...point,
          left: (point.x / width) * 100,
          top: (point.y / height) * 100,
        })),
      }))
      setTileAppliedAreaId(activeAreaId)
    } catch (error) {
      clearTilePreview()
      setApplyError(error.message || 'Product perspective could not be applied.')
    } finally {
      tileMat?.delete()
      warpedMat?.delete()
      sourcePoints?.delete()
      destinationPoints?.delete()
      transform?.delete()
      setIsApplying(false)
    }
  }

  const activeArea = areas.find((area) => area.id === activeAreaId) ?? null
  const activeMaskState = activeArea ? maskStates[activeArea.id] : null
  const activePoints = activeAreaId ? pointsByArea[activeAreaId] || [] : []
  const canUseProducts = Boolean(activeArea && activeMaskState?.status === 'success' && activePoints.length === 4)
  const roomAspectRatio = roomImageSize.width / roomImageSize.height
  const roomFrameStyle = {
    aspectRatio: `${roomImageSize.width} / ${roomImageSize.height}`,
    width: `min(100%, calc((100dvh - 190px) * ${roomAspectRatio}))`,
  }

  return (
    <div className="grid h-screen grid-rows-[72px_minmax(0,1fr)] overflow-hidden border-t-[5px] border-[#333] bg-[#f1f3f4] font-sans text-[#242424]">
      <header className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#ddd] bg-white px-5 max-md:px-3"><Brand /><nav className="flex items-center justify-center gap-1 max-md:hidden"><button className="rounded-lg px-3 py-2 text-[11px] text-[#555]">53%</button><button className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#444] hover:bg-[#f4f4f4]"><Icon name="compare" size={17} /> Compare</button><button className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#444] hover:bg-[#f4f4f4]"><Icon name="download" size={17} /> Download</button><button className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#444] hover:bg-[#f4f4f4]"><Icon name="share" size={17} /> Share</button><button onClick={onChangeRoom} className="ml-2 flex items-center gap-2 rounded-full border border-[#ef4444] px-4 py-2 text-[11px] font-semibold text-[#ef4444]"><Icon name="plus" size={16} /> New room</button></nav><button className="justify-self-end rounded-full bg-[#f1f1f1] px-4 py-2 text-[10px] text-[#666]">Exit</button></header>

      <main className="grid min-h-0 grid-cols-[58px_310px_minmax(0,1fr)] max-lg:grid-cols-[58px_260px_minmax(0,1fr)] max-md:grid-cols-[52px_minmax(0,1fr)]">
        <aside className="z-20 flex min-h-0 flex-col items-center bg-[#242424]"><ActivityButton active={panel === 'points'} icon="points" label="Surface points" onClick={() => setPanel('points')} /><ActivityButton active={panel === 'products'} icon="products" label={canUseProducts ? 'Products' : 'Add 4 points first'} disabled={!canUseProducts} onClick={() => { setPointMode(false); setPanel('products') }} /><div className="mt-auto w-full border-t border-white/10"><ActivityButton icon="adjust" label="Settings" /></div></aside>
        <div className="min-h-0 max-md:absolute max-md:bottom-0 max-md:left-[52px] max-md:top-[72px] max-md:z-10 max-md:w-[280px] max-md:shadow-xl">{panel === 'points' ? <PointsPanel areas={areas} activeAreaId={activeAreaId} activeArea={activeArea} activePoints={activePoints} onSelectArea={selectArea} maskStates={maskStates} pointMode={pointMode} onStartPoints={startAddingPoints} isAddingArea={isAddingArea} pendingArea={pendingArea} draftName={draftName} setDraftName={setDraftName} draftType={draftType} setDraftType={setDraftType} onStartAdd={startAddingArea} onCancelAdd={cancelAddingArea} onSaveArea={saveArea} /> : <ProductsPanel selectedProduct={selectedProduct} onSelectProduct={applyProduct} isApplying={isApplying} activeArea={activeArea} applyError={applyError} />}</div>
        <section className="relative grid min-h-0 min-w-0 grid-rows-[40px_minmax(0,1fr)_58px] bg-[#f3f4f5] bg-[radial-gradient(#d0d0d0_0.7px,transparent_0.7px)] bg-[length:7px_7px]">
          <div className="flex items-center justify-between px-5 text-[9px] text-[#888]"><span>Workspace / <strong className="text-[#333]">{room.name}</strong></span><span className="rounded-full bg-white px-3 py-1 shadow-sm">{panel === 'points' ? 'Surface areas' : 'Products'}</span></div>
          <div className="flex min-h-0 items-center justify-center px-5 pb-5">
            <div
              onClick={handleRoomClick}
              style={roomFrameStyle}
              className={`relative max-h-full max-w-[1180px] overflow-hidden rounded-sm bg-[#ddd] shadow-[0_18px_50px_rgba(0,0,0,0.16)] ${(isAddingArea || pointMode) ? 'cursor-crosshair ring-2 ring-[#ef4444] ring-offset-2' : ''}`}
            >
              <img
                ref={roomImageRef}
                src={room.src}
                alt={room.name}
                onLoad={(event) => setRoomImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
                className="absolute inset-0 block h-full w-full select-none object-contain"
                draggable="false"
              />

              {activeMaskState?.status === 'success' && tileAppliedAreaId !== activeAreaId && (
                <img src={activeMaskState.url} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain" />
              )}

              <canvas ref={tileCanvasRef} className="pointer-events-none absolute inset-0 z-[2] h-full w-full" aria-hidden="true" />

              {activePoints.length > 1 && (
                <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox={`0 0 ${roomImageSize.width} ${roomImageSize.height}`} preserveAspectRatio="none" aria-hidden="true">
                  {activePoints.length === 4
                    ? <polygon points={activePoints.map(({ x, y }) => `${x},${y}`).join(' ')} fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="5" strokeDasharray="14 10" />
                    : <polyline points={activePoints.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="5" strokeDasharray="14 10" />}
                </svg>
              )}

              {activePoints.map((point, index) => (
                <button
                  key={`${activeAreaId}-${index}`}
                  type="button"
                  style={{ left: `${point.left}%`, top: `${point.top}%` }}
                  className="absolute z-30 grid size-7 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full border-2 border-white bg-[#ef4444] text-[9px] font-bold text-white shadow-[0_3px_12px_rgba(0,0,0,.35)]"
                  aria-label={`Perspective point ${index + 1}`}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => handlePerspectivePointDown(index, event)}
                  onPointerMove={handlePerspectivePointMove}
                  onPointerUp={handlePerspectivePointUp}
                  onPointerCancel={handlePerspectivePointUp}
                >
                  {index + 1}
                </button>
              ))}

              {activeMaskState?.status === 'loading' && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-[#242424]/85 px-4 py-2 text-[9px] font-semibold text-white shadow-lg backdrop-blur-sm"><span className="size-3 animate-spin rounded-full border-2 border-white/35 border-t-white" /> Generating {activeArea?.name} mask…</div>
              )}

              {isApplying && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-[#242424]/85 px-4 py-2 text-[9px] font-semibold text-white shadow-lg backdrop-blur-sm"><span className="size-3 animate-spin rounded-full border-2 border-white/35 border-t-white" /> Applying {selectedProduct?.name}…</div>
              )}

              {activeMaskState?.status === 'error' && (
                <div className="absolute bottom-4 left-1/2 z-20 max-w-[80%] -translate-x-1/2 rounded-lg bg-[#242424]/90 px-4 py-2 text-center text-[9px] font-semibold text-white shadow-lg" role="alert">{activeMaskState.error}</div>
              )}

              {isAddingArea && !pendingArea && <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-[#222]/85 px-4 py-2 text-[9px] font-semibold text-white shadow-lg">Click the image to place Area {String(areas.length + 1).padStart(2, '0')}</div>}

              {pointMode && <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-[#222]/85 px-4 py-2 text-[9px] font-semibold text-white shadow-lg">Add perspective points · {activePoints.length}/4</div>}

              {areas.map((area) => {
                const selected = area.id === activeAreaId
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); selectArea(area) }}
                    style={{ left: `${area.x}%`, top: `${area.y}%` }}
                    className={`group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white px-3 py-1.5 text-[8px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.35)] transition hover:scale-105 ${selected ? 'bg-[#ef4444] ring-4 ring-[#ef4444]/25' : 'bg-[#242424]/90'}`}
                    aria-label={`Select ${area.name}`}
                  >
                    <span className="whitespace-nowrap">{area.name}</span>
                  </button>
                )
              })}

              {pendingArea && (
                <span
                  style={{ left: `${pendingArea.x}%`, top: `${pendingArea.y}%` }}
                  className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="relative flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-white bg-[#ef4444] px-3 py-1.5 text-[8px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.28)] ring-4 ring-[#ef4444]/20"><Icon name="points" size={12} /> {draftName.trim() || `Area ${String(areas.length + 1).padStart(2, '0')}`}</span>
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[minmax(170px,240px)_minmax(0,1fr)] border-t border-[#ddd] bg-white">
            <div className="flex min-w-0 items-center gap-3 border-r border-[#ddd] px-4"><span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-[#f2f2f2] text-[#333]"><Icon name={panel === 'points' ? 'layers' : 'products'} size={17} /><i className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#ef4444] text-[8px] not-italic text-white">{panel === 'points' ? areas.length : selectedProduct ? 1 : 0}</i></span><span className="min-w-0"><small className="block text-[8px] text-[#888]">{panel === 'points' ? 'Selected surface' : 'Selected product'}</small><strong className="mt-0.5 block truncate text-[10px]">{panel === 'points' ? (activeArea ? `${activeArea.name} · ${activeArea.type}` : 'No area selected') : (selectedProduct?.name || 'Choose a product')}</strong></span></div>
            <div className="flex items-center justify-end gap-1 overflow-x-auto px-4 text-[10px]">
              <button className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[#333] hover:bg-[#f5f5f5]"><Icon name="reset" size={17} /> Reset</button>
              <button className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[#333] hover:bg-[#f5f5f5]"><Icon name="grout" size={17} /> Grout</button>
              <button className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[#333] hover:bg-[#f5f5f5]"><Icon name="layout" size={17} /> Layout</button>
              <button className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[#333] hover:bg-[#f5f5f5]"><Icon name="applied" size={17} /> Applied products</button>
              <button className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[#333] hover:bg-[#f5f5f5]"><Icon name="compare" size={17} /> Compare</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function RoomFlow() {
  const [workspaceRoom, setWorkspaceRoom] = useState(null)
  return workspaceRoom ? <Workspace room={workspaceRoom} onChangeRoom={() => setWorkspaceRoom(null)} /> : <RoomLibrary onContinue={setWorkspaceRoom} />
}

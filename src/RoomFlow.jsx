import { useState } from 'react'

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

const SURFACES = [
  { id: 1, name: 'Wall 01', type: 'Wall' },
  { id: 2, name: 'Wall 02', type: 'Wall' },
  { id: 3, name: 'Wall 03', type: 'Wall' },
  { id: 4, name: 'Floor 01', type: 'Floor' },
]

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
  const [category, setCategory] = useState('All')
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0])
  const categories = ['All', 'Living', 'Bedroom', 'Kitchen', 'Dining']
  const visibleRooms = category === 'All' ? ROOMS : ROOMS.filter((room) => room.category === category)

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans text-[#242424]">
      <header className="grid h-[72px] grid-cols-[1fr_auto_1fr] items-center border-t-[5px] border-[#333] border-b border-[#e5e5e5] bg-white px-6 max-md:grid-cols-[1fr_auto]">
        <Brand />
        <div className="flex items-center gap-2 text-[11px] text-[#8a8a8a] max-md:hidden"><span className="grid size-7 place-items-center rounded-full bg-[#ef4444] font-bold text-white">1</span><span className="h-px w-20 bg-[#dedede]" /><span className="grid size-7 place-items-center rounded-full border border-[#dedede] bg-white font-bold">2</span><span className="ml-2">Choose room → Workspace</span></div>
        <button className="justify-self-end rounded-full bg-[#f1f1f1] px-4 py-2 text-xs text-[#666]">Exit</button>
      </header>

      <main className="grid min-h-[calc(100vh-72px)] grid-cols-[340px_minmax(0,1fr)] max-lg:grid-cols-[290px_minmax(0,1fr)] max-md:block">
        <aside className="border-r border-[#e4e4e4] bg-white p-8 max-md:border-r-0 max-md:border-b">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-[#ef4444]">START YOUR PROJECT</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-[-0.05em]">Make the space yours.</h1>
          <p className="mt-4 text-sm leading-6 text-[#767676]">Select a room to preview the visualizer workflow.</p>
          <div className="mt-7 overflow-hidden rounded-2xl border border-[#dedede] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#eee]"><img className="h-full w-full object-cover" src={selectedRoom.src} alt={selectedRoom.name} /><span className="absolute left-3 top-3 rounded-full bg-[#222]/80 px-3 py-1.5 text-[9px] text-white">Selected room</span></div>
            <div className="px-4 py-3"><small className="text-[9px] text-[#999]">{selectedRoom.category}</small><strong className="mt-1 block text-xs">{selectedRoom.name}</strong></div>
            <button onClick={() => onContinue(selectedRoom)} className="mx-3 mb-3 flex h-11 w-[calc(100%-24px)] items-center justify-center gap-2 rounded-xl bg-[#ef4444] text-xs font-bold text-white transition hover:bg-[#dc3838]">Open workspace <Icon name="arrow" size={16} /></button>
          </div>
        </aside>

        <section className="min-w-0 p-10 max-md:p-5">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold tracking-[0.18em] text-[#ef4444]">ROOM LIBRARY</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">Choose a styled space</h2></div><span className="text-xs text-[#888]">{visibleRooms.length} rooms</span></div>
          <div className="my-6 flex gap-2 overflow-x-auto">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-[11px] ${category === item ? 'bg-[#242424] text-white' : 'border border-[#ddd] bg-white text-[#666]'}`}>{item}</button>)}</div>
          <div className="grid grid-cols-3 gap-x-5 gap-y-7 max-xl:grid-cols-2 max-sm:grid-cols-1">
            {visibleRooms.map((room) => <button key={room.id} onClick={() => setSelectedRoom(room)} className={`group overflow-hidden rounded-xl border bg-white p-2 text-left transition ${selectedRoom.id === room.id ? 'border-[#ef4444] ring-2 ring-[#ef4444]/10' : 'border-[#e1e1e1] hover:border-[#aaa]'}`}><span className="relative block aspect-[3/2] overflow-hidden rounded-lg"><img src={room.src} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />{selectedRoom.id === room.id && <span className="absolute right-2 top-2 rounded-full bg-[#ef4444] px-2 py-1 text-[8px] font-bold text-white">SELECTED</span>}</span><span className="block px-2 py-3"><strong className="block text-xs">{room.name}</strong><small className="mt-1 block text-[10px] text-[#888]">{room.category}</small></span></button>)}
          </div>
        </section>
      </main>
    </div>
  )
}

function ActivityButton({ active, icon, label, onClick }) {
  return <button onClick={onClick} className={`group relative grid h-14 w-full place-items-center transition ${active ? 'bg-white text-[#ef4444]' : 'text-[#8a8a8a] hover:bg-[#333] hover:text-white'}`} aria-label={label}>{active && <span className="absolute left-0 h-8 w-[3px] rounded-r bg-[#ef4444]" />}<Icon name={icon} size={21} /><span className="pointer-events-none absolute left-[58px] z-30 hidden whitespace-nowrap rounded bg-[#222] px-2 py-1 text-[9px] text-white shadow group-hover:block">{label}</span></button>
}

function PointsPanel({ activeSurface, setActiveSurface }) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[#dfdfdf] bg-white">
      <div className="flex h-[66px] items-center justify-between border-b border-[#e5e5e5] px-5"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef4444]">Point workspace</p><h2 className="mt-1 text-sm font-bold">Surfaces & points</h2></div><button className="rounded-full border border-[#ef4444] px-3 py-1.5 text-[9px] font-semibold text-[#ef4444]">Adjust points</button></div>
      <div className="grid grid-cols-3 gap-1 border-b border-[#e8e8e8] p-3"><button className="rounded-lg bg-[#ef4444] py-2 text-[10px] font-semibold text-white">All</button><button className="flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] text-[#777]"><Icon name="grid" size={14} /> Floor</button><button className="flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] text-[#777]"><Icon name="wall" size={14} /> Wall</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {SURFACES.map((surface) => <button key={surface.id} onClick={() => setActiveSurface(surface.id)} className={`grid w-full grid-cols-[45px_1fr_auto] items-center gap-3 border-b border-[#ededed] p-3 text-left ${activeSurface === surface.id ? 'bg-[#fff0ef]' : 'hover:bg-[#fafafa]'}`}><span className="grid size-11 place-items-center bg-[linear-gradient(45deg,#d8dade_25%,transparent_25%),linear-gradient(-45deg,#d8dade_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d8dade_75%),linear-gradient(-45deg,transparent_75%,#d8dade_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0] text-[#555]"><Icon name={surface.type === 'Wall' ? 'wall' : 'grid'} size={17} /></span><span><strong className="block text-[11px]">{surface.name}</strong><small className="mt-1 block text-[9px] text-[#999]">4 points</small></span><span className={`rounded-full px-2 py-1 text-[8px] font-bold ${activeSurface === surface.id ? 'bg-[#ef4444]' : 'bg-[#242424]'} text-white`}>Open</span></button>)}
      </div>
      <div className="m-4 rounded-xl bg-[#f5f5f5] p-3 text-[10px] leading-4 text-[#777]"><strong className="text-[#333]">Point mode</strong><br />Select a surface to view and manage its points.</div>
    </aside>
  )
}

function ProductsPanel({ selectedProduct, setSelectedProduct }) {
  const [query, setQuery] = useState('')
  const visible = PRODUCTS.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[#dfdfdf] bg-white">
      <div className="border-b border-[#e5e5e5] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef4444]">Product workspace</p><h2 className="mt-1 text-sm font-bold">Choose a product</h2><label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-[#ddd] px-3 text-[#888] focus-within:border-[#ef4444]"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="min-w-0 flex-1 border-0 bg-transparent text-[10px] text-[#333] outline-none" /></label></div>
      <div className="flex gap-2 border-b border-[#e8e8e8] p-3"><button className="rounded-full bg-[#242424] px-3 py-1.5 text-[9px] text-white">All</button><button className="rounded-full border border-[#ddd] px-3 py-1.5 text-[9px] text-[#666]">Wall</button><button className="rounded-full border border-[#ddd] px-3 py-1.5 text-[9px] text-[#666]">Floor</button></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visible.map((product) => <button key={product.id} onClick={() => setSelectedProduct(product)} className={`grid w-full grid-cols-[70px_1fr] gap-3 rounded-xl border p-2 text-left transition ${selectedProduct.id === product.id ? 'border-[#ef4444] bg-[#fff6f5]' : 'border-[#dedede] hover:border-[#aaa]'}`}><img src={product.src} alt="" className="size-[70px] rounded-lg border border-[#eee] object-cover" /><span className="min-w-0 py-1"><span className="flex items-start justify-between gap-2"><strong className="truncate text-[10px] uppercase">{product.name}</strong>{selectedProduct.id === product.id && <i className="grid size-4 shrink-0 place-items-center rounded-full bg-[#ef4444] text-[9px] not-italic text-white">✓</i>}</span><small className="mt-1 block text-[9px] text-[#777]">SKU: {product.sku}</small><small className="block text-[9px] text-[#777]">{product.size}</small>{product.badge && <em className="mt-2 inline-block rounded bg-[#242424] px-1.5 py-0.5 text-[7px] not-italic text-white">{product.badge}</em>}</span></button>)}
      </div>
    </aside>
  )
}

function Workspace({ room, onChangeRoom }) {
  const [panel, setPanel] = useState('points')
  const [activeSurface, setActiveSurface] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0])

  return (
    <div className="grid h-screen grid-rows-[72px_minmax(0,1fr)_58px] overflow-hidden border-t-[5px] border-[#333] bg-[#f1f3f4] font-sans text-[#242424]">
      <header className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#ddd] bg-white px-5 max-md:px-3"><Brand /><nav className="flex items-center justify-center gap-1 max-md:hidden"><button className="rounded-lg px-3 py-2 text-[11px] text-[#555]">53%</button><button className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#444] hover:bg-[#f4f4f4]"><Icon name="compare" size={17} /> Compare</button><button className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#444] hover:bg-[#f4f4f4]"><Icon name="download" size={17} /> Download</button><button className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#444] hover:bg-[#f4f4f4]"><Icon name="share" size={17} /> Share</button><button onClick={onChangeRoom} className="ml-2 flex items-center gap-2 rounded-full border border-[#ef4444] px-4 py-2 text-[11px] font-semibold text-[#ef4444]"><Icon name="plus" size={16} /> New room</button></nav><button className="justify-self-end rounded-full bg-[#f1f1f1] px-4 py-2 text-[10px] text-[#666]">Exit</button></header>

      <main className="grid min-h-0 grid-cols-[58px_310px_minmax(0,1fr)] max-lg:grid-cols-[58px_260px_minmax(0,1fr)] max-md:grid-cols-[52px_minmax(0,1fr)]">
        <aside className="z-20 flex min-h-0 flex-col items-center bg-[#242424]"><ActivityButton active={panel === 'points'} icon="points" label="Surface points" onClick={() => setPanel('points')} /><ActivityButton active={panel === 'products'} icon="products" label="Products" onClick={() => setPanel('products')} /><div className="mt-auto w-full border-t border-white/10"><ActivityButton icon="adjust" label="Settings" /></div></aside>
        <div className="min-h-0 max-md:absolute max-md:bottom-[58px] max-md:left-[52px] max-md:top-[72px] max-md:z-10 max-md:w-[280px] max-md:shadow-xl">{panel === 'points' ? <PointsPanel activeSurface={activeSurface} setActiveSurface={setActiveSurface} /> : <ProductsPanel selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} />}</div>
        <section className="relative flex min-h-0 min-w-0 flex-col bg-[#f3f4f5] bg-[radial-gradient(#d0d0d0_0.7px,transparent_0.7px)] bg-[length:7px_7px]">
          <div className="flex h-10 shrink-0 items-center justify-between px-5 text-[9px] text-[#888]"><span>Workspace / <strong className="text-[#333]">{room.name}</strong></span><span className="rounded-full bg-white px-3 py-1 shadow-sm">{panel === 'points' ? 'Point workspace' : 'Product workspace'}</span></div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-5"><div className="relative max-h-full w-full max-w-[1180px] overflow-hidden rounded-sm bg-[#ddd] shadow-[0_18px_50px_rgba(0,0,0,0.16)]"><img src={room.src} alt={room.name} className="block max-h-[calc(100vh-190px)] w-full object-cover" />{panel === 'points' && <><svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 650" preserveAspectRatio="none"><polygon points="210,145 715,135 735,515 195,525" fill="rgba(239,68,68,.08)" stroke="#ef4444" strokeWidth="2" strokeDasharray="8 8" vectorEffect="non-scaling-stroke" /></svg>{[[21,22],[71.5,21],[73.5,79],[19.5,81]].map(([x,y], index) => <span key={index} style={{ left: `${x}%`, top: `${y}%` }} className="absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-[#ef4444] text-[9px] font-bold text-white shadow-[0_3px_12px_rgba(0,0,0,.35)]">{index + 1}</span>)}<span className="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full bg-[#ef4444] px-3 py-1.5 text-[9px] font-bold text-white shadow">Wall {activeSurface.toString().padStart(2, '0')}</span></>}{panel === 'products' && <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl bg-white/95 p-2 pr-4 shadow-lg backdrop-blur"><img src={selectedProduct.src} alt="" className="size-11 rounded-lg object-cover" /><span><small className="block text-[8px] text-[#888]">Selected product</small><strong className="mt-0.5 block text-[10px] uppercase">{selectedProduct.name}</strong></span></div>}</div></div>
        </section>
      </main>

      <footer className="grid grid-cols-[368px_minmax(0,1fr)] border-t border-[#ddd] bg-white max-lg:grid-cols-[318px_minmax(0,1fr)] max-md:grid-cols-[180px_minmax(0,1fr)]"><div className="flex items-center gap-3 border-r border-[#ddd] px-5"><span className="relative grid size-8 place-items-center rounded-lg bg-[#fff0ef] text-[#ef4444]"><Icon name={panel === 'points' ? 'layers' : 'products'} size={17} /><i className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#ef4444] text-[8px] not-italic text-white">1</i></span><span className="min-w-0"><small className="block text-[8px] text-[#888]">{panel === 'points' ? 'Selected surface' : 'Selected product'}</small><strong className="mt-0.5 block truncate text-[10px]">{panel === 'points' ? `Wall ${activeSurface.toString().padStart(2, '0')}` : selectedProduct.name}</strong></span></div><div className="flex items-center justify-end gap-1 overflow-x-auto px-4 text-[10px]"><button className="rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">Reset</button><button className="rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">Grout</button><button className="rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">Layout</button><button className="rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">Applied products</button><button className="rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">Compare</button></div></footer>
    </div>
  )
}

export default function RoomFlow() {
  const [workspaceRoom, setWorkspaceRoom] = useState(null)
  return workspaceRoom ? <Workspace room={workspaceRoom} onChangeRoom={() => setWorkspaceRoom(null)} /> : <RoomLibrary onContinue={setWorkspaceRoom} />
}

import { useEffect, useRef, useState } from 'react'

import Brand from './Brand'
import { ROOMS } from './flowData'
import Icon from './Icon'

export default function RoomLibrary({ onContinue }) {
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

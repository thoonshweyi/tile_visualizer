import { useEffect, useRef, useState } from 'react'
import './RoomFlow.css'

import diningRoom from './assets/img/rooms/samplediningroom2.png'
import diningRoomWide from './assets/img/rooms/samplediningroom.png'
import livingRoom from './assets/img/rooms/simplelivingroom.jpg'
import livingRoomSoft from './assets/img/rooms/simplelivingroom2.png'
import bedroom from './assets/img/rooms/simplebedroom.jpg'
import kitchen from './assets/img/rooms/simplekitchen.jpg'

const ROOMS = [
  { id: 'living-sun', name: 'Sunlit living room', category: 'Living', src: livingRoom },
  { id: 'living-soft', name: 'Soft living room', category: 'Living', src: livingRoomSoft },
  { id: 'bedroom-calm', name: 'Calm bedroom', category: 'Bedroom', src: bedroom },
  { id: 'kitchen-modern', name: 'Modern kitchen', category: 'Kitchen', src: kitchen },
  { id: 'dining-warm', name: 'Warm dining room', category: 'Dining', src: diningRoom },
  { id: 'dining-airy', name: 'Airy dining room', category: 'Dining', src: diningRoomWide },
]

const CATEGORIES = ['All', 'Living', 'Bedroom', 'Kitchen', 'Dining']

function Icon({ name, size = 18 }) {
  const paths = {
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 17 5-4 4 3 3-2 4 3"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
    zoomOut: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="M8 10.5h5M15 15l5 5"/></>,
    zoomIn: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="M8 10.5h5m-2.5-2.5v5M15 15l5 5"/></>,
    compare: <><path d="M8 5 4 9l4 4M4 9h8M16 19l4-4-4-4m4 4h-8"/></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></>,
    share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    exit: <><path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    wall: <><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 4v6m6 0v10M3 15h12"/></>,
    grid: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M4 12h16"/></>,
    reset: <><path d="M4.5 8A8 8 0 1 1 4 13"/><path d="M4 4v4h4"/></>,
    eye: <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/></>,
    layout: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M9 10h12"/></>,
    products: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7M14 17.5h7"/></>,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function Brand() {
  return (
    <div className="room-brand" aria-label="Tile Room Studio">
      <span className="room-brand__mark"><i /><i /><i /><i /></span>
      <span><strong>TileRoom</strong><small>visual studio</small></span>
    </div>
  )
}

function ToolbarButton({ icon, children, accent = false }) {
  return (
    <button className={`studio-tool ${accent ? 'studio-tool--accent' : ''}`} type="button">
      <Icon name={icon} />
      <span>{children}</span>
    </button>
  )
}

function RoomLibrary({ onContinue }) {
  const uploadRef = useRef(null)
  const uploadedUrlRef = useRef(null)
  const [category, setCategory] = useState('All')
  const [selectedRoom, setSelectedRoom] = useState(null)

  useEffect(() => () => {
    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current)
  }, [])

  const handleUpload = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return

    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current)
    const url = URL.createObjectURL(nextFile)
    uploadedUrlRef.current = url
    setSelectedRoom({
      id: `upload-${Date.now()}`,
      name: nextFile.name,
      category: 'Your room',
      src: url,
      uploaded: true,
    })
    event.target.value = ''
  }

  const visibleRooms = category === 'All'
    ? ROOMS
    : ROOMS.filter((room) => room.category === category)

  return (
    <div className="room-library-page">
      <header className="library-header">
        <Brand />
        <div className="library-header__steps" aria-label="Current step">
          <span className="is-active">1</span>
          <i />
          <span>2</span>
          <small>Choose room&nbsp;&nbsp;&nbsp; Workspace</small>
        </div>
        <button className="quiet-button" type="button">Exit <Icon name="exit" size={16} /></button>
      </header>

      <main className="library-main">
        <aside className="upload-panel">
          <div className="section-label">START YOUR PROJECT</div>
          <h1>{selectedRoom ? 'Review your room' : 'Make the space yours.'}</h1>
          <p className="upload-panel__copy">
            {selectedRoom
              ? 'Check the room before opening your workspace.'
              : 'Upload your own photo or begin with one of our ready-made spaces.'}
          </p>

          {selectedRoom ? (
            <div className="room-preview-card">
              <div className="room-preview-card__image">
                <img src={selectedRoom.src} alt={selectedRoom.name} />
                <span>{selectedRoom.uploaded ? 'Your upload' : 'Ready-made room'}</span>
              </div>
              <div className="room-preview-card__meta">
                <div><small>Selected room</small><strong>{selectedRoom.name}</strong></div>
                <button type="button" onClick={() => setSelectedRoom(null)}>Change</button>
              </div>
              <button className="continue-button" type="button" onClick={() => onContinue(selectedRoom)}>
                Continue to workspace <Icon name="arrow" />
              </button>
            </div>
          ) : (
            <button className="upload-dropzone" type="button" onClick={() => uploadRef.current?.click()}>
              <span className="upload-dropzone__icon"><Icon name="image" size={28} /></span>
              <strong>Upload your room</strong>
              <span>Choose a clear JPG, PNG or WEBP image</span>
              <em><Icon name="upload" size={17} /> Browse image</em>
            </button>
          )}

          <input ref={uploadRef} className="visually-hidden" type="file" accept="image/*" onChange={handleUpload} />

          <div className="upload-tips">
            <span>For the best result</span>
            <ul>
              <li>Use a bright, clear room photo</li>
              <li>Keep walls and floors visible</li>
              <li>Avoid heavily cropped images</li>
            </ul>
          </div>
        </aside>

        <section className="room-gallery">
          <div className="room-gallery__heading">
            <div><span className="section-label">READY-MADE ROOMS</span><h2>Or start with a styled space</h2></div>
            <span className="room-count">{visibleRooms.length} rooms</span>
          </div>

          <div className="category-tabs" role="tablist" aria-label="Room categories">
            {CATEGORIES.map((item) => (
              <button
                className={category === item ? 'is-active' : ''}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="room-grid">
            {visibleRooms.map((room) => (
              <button className="room-card" key={room.id} type="button" onClick={() => setSelectedRoom(room)}>
                <span className="room-card__image"><img src={room.src} alt="" /><i><Icon name="arrow" size={17} /></i></span>
                <span className="room-card__details"><strong>{room.name}</strong><small>{room.category}</small></span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Workspace({ room, onChangeRoom }) {
  return (
    <div className="studio-page">
      <header className="studio-topbar">
        <Brand />
        <div className="studio-topbar__tools">
          <div className="zoom-cluster"><button type="button" aria-label="Zoom out"><Icon name="zoomOut" /></button><strong>68%</strong><button type="button" aria-label="Zoom in"><Icon name="zoomIn" /></button></div>
          <ToolbarButton icon="compare">Compare</ToolbarButton>
          <ToolbarButton icon="download">Download</ToolbarButton>
          <ToolbarButton icon="share">Share</ToolbarButton>
          <button className="new-room-button" type="button" onClick={onChangeRoom}><Icon name="plus" /> New room</button>
        </div>
        <button className="quiet-button" type="button">Exit <Icon name="exit" size={16} /></button>
      </header>

      <main className="studio-workspace">
        <aside className="surface-panel">
          <div className="surface-panel__title"><div><span className="section-label">SURFACES</span><h2>Room areas</h2></div><button type="button">Adjust</button></div>
          <div className="surface-tabs"><button className="is-active" type="button">All</button><button type="button"><Icon name="layers" size={16} /> Floor</button><button type="button"><Icon name="wall" size={16} /> Wall</button></div>
          <div className="surface-list">
            {['Wall 01', 'Wall 02', 'Floor 01'].map((surface, index) => (
              <div className={`surface-item ${index === 0 ? 'is-active' : ''}`} key={surface}>
                <span className="surface-item__thumb"><Icon name={surface.startsWith('Wall') ? 'wall' : 'grid'} /></span>
                <div><strong>{surface}</strong><small>No material selected</small></div>
                <button type="button"><Icon name="plus" size={14} /> Material</button>
              </div>
            ))}
          </div>
          <div className="surface-panel__note"><span>Tip</span><p>Select a surface, then choose a material to begin visualizing.</p></div>
        </aside>

        <section className="room-stage">
          <div className="room-stage__breadcrumb"><span>Workspace</span><i>/</i><strong>{room.name}</strong></div>
          <div className="room-stage__canvas">
            <img src={room.src} alt={room.name} />
            <span className="room-stage__badge">Room preview</span>
            <button className="edge-arrow" type="button" aria-label="Open side panel">‹</button>
          </div>
        </section>
      </main>

      <footer className="studio-bottombar">
        <div className="selected-surface"><span><Icon name="layers" /></span><div><small>Selected surface</small><strong>Wall 01</strong></div></div>
        <div className="studio-bottombar__tools">
          <ToolbarButton icon="reset">Reset</ToolbarButton>
          <ToolbarButton icon="grid">Grout</ToolbarButton>
          <ToolbarButton icon="layout">Layout</ToolbarButton>
          <ToolbarButton icon="products">Applied products</ToolbarButton>
          <ToolbarButton icon="compare">Compare</ToolbarButton>
        </div>
      </footer>
    </div>
  )
}

export default function RoomFlow() {
  const [workspaceRoom, setWorkspaceRoom] = useState(null)

  return workspaceRoom
    ? <Workspace room={workspaceRoom} onChangeRoom={() => setWorkspaceRoom(null)} />
    : <RoomLibrary onContinue={setWorkspaceRoom} />
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cvModule from '@techstark/opencv-js'
import './TileVisualizer.css'

import diningRoom from './assets/img/rooms/samplediningroom2.png'
import diningRoomWide from './assets/img/rooms/samplediningroom.png'
import livingRoom from './assets/img/rooms/simplelivingroom.jpg'
import livingRoomCompact from './assets/img/rooms/simplelivingroom2.png'
import bedroom from './assets/img/rooms/simplebedroom.jpg'
import kitchen from './assets/img/rooms/simplekitchen.jpg'

import tile01 from './assets/img/tiles/2000000600727 Tile.jpg'
import tile02 from './assets/img/tiles/2000000591766 Tile.jpg'
import tile03 from './assets/img/tiles/2000000503004 Tile.jpg'
import tile04 from './assets/img/tiles/2000000432168 Tile.jpg'
import tile05 from './assets/img/tiles/2000000443478 Tile.jpg'
import tile06 from './assets/img/tiles/2000000602547 Tile.jpg'
import tile07 from './assets/img/tiles/2000000504889 Tile.jpg'
import tile08 from './assets/img/tiles/2000000347875 Tile.jpg'
import tile09 from './assets/img/tiles/2000000155098 Tile.jpg'
import tile10 from './assets/img/tiles/2000000600741 Tile.jpg'
import tile11 from './assets/img/tiles/2000000548234 Tile.jpg'

const ROOMS = [
  {
    id: 'dining',
    name: 'Warm dining room',
    src: diningRoom,
    points: [[0.255, 0.183], [0.685, 0.175], [0.678, 0.815], [0.248, 0.82]],
  },
  {
    id: 'dining-wide',
    name: 'Minimal dining room',
    src: diningRoomWide,
    points: [[0.095, 0.12], [0.535, 0.17], [0.548, 0.77], [0.108, 0.83]],
  },
  {
    id: 'living',
    name: 'Sunlit living room',
    src: livingRoom,
    points: [[0.105, 0.115], [0.625, 0.16], [0.59, 0.79], [0.12, 0.83]],
  },
  {
    id: 'living-compact',
    name: 'Soft living room',
    src: livingRoomCompact,
    points: [[0.075, 0.11], [0.56, 0.145], [0.575, 0.79], [0.09, 0.84]],
  },
  {
    id: 'bedroom',
    name: 'Calm bedroom',
    src: bedroom,
    points: [[0.04, 0.08], [0.46, 0.13], [0.48, 0.78], [0.05, 0.85]],
  },
  {
    id: 'kitchen',
    name: 'Modern kitchen',
    src: kitchen,
    points: [[0.08, 0.12], [0.585, 0.15], [0.57, 0.8], [0.09, 0.84]],
  },
]

const TILES = [
  { id: 'stone-vein', name: 'Ivory Vein', code: '600727', src: tile01 },
  { id: 'cloud-marble', name: 'Cloud Marble', code: '591766', src: tile02 },
  { id: 'sandstone', name: 'Warm Sand', code: '503004', src: tile03 },
  { id: 'soft-terrazzo', name: 'Soft Terrazzo', code: '432168', src: tile04 },
  { id: 'travertine', name: 'Travertine', code: '443478', src: tile05 },
  { id: 'pearl-stone', name: 'Pearl Stone', code: '602547', src: tile06 },
  { id: 'slate', name: 'Silver Slate', code: '504889', src: tile07 },
  { id: 'warm-concrete', name: 'Warm Concrete', code: '347875', src: tile08 },
  { id: 'calacatta', name: 'Calacatta', code: '155098', src: tile09 },
  { id: 'alpine', name: 'Alpine White', code: '600741', src: tile10 },
  { id: 'linear-stone', name: 'Linear Stone', code: '548234', src: tile11 },
]

const MAX_CANVAS_WIDTH = 1400
let openCvPromise

function getOpenCv() {
  if (openCvPromise) return openCvPromise

  openCvPromise = (async () => {
    if (cvModule instanceof Promise) return cvModule
    if (cvModule.Mat) return cvModule

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('OpenCV took too long to initialize.')),
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeDefaultPoints(room, width, height) {
  return room.points.map(([x, y]) => ({ x: x * width, y: y * height }))
}

function drawCover(context, image, x, y, width, height) {
  const imageRatio = image.naturalWidth / image.naturalHeight
  const cellRatio = width / height
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight

  if (imageRatio > cellRatio) {
    sourceWidth = image.naturalHeight * cellRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = image.naturalWidth / cellRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  )
}

function Icon({ name, size = 18 }) {
  const paths = {
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></>,
    reset: <><path d="M4.6 8A8 8 0 1 1 4 13"/><path d="M4 4v4h4"/></>,
    eye: <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/></>,
    eyeOff: <><path d="m3 3 18 18"/><path d="M10.6 7.1A11.9 11.9 0 0 1 12 7c6 0 9.5 5 9.5 5a17 17 0 0 1-2.1 2.5M6.4 6.4C3.9 8 2.5 12 2.5 12s3.5 5 9.5 5a10 10 0 0 0 3-.4"/></>,
    sparkle: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  }

  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function TileVisualizer() {
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const tileImageRef = useRef(null)
  const roomUploadRef = useRef(null)
  const tileUploadRef = useRef(null)
  const uploadedRoomUrlRef = useRef(null)
  const uploadedTileUrlRef = useRef(null)
  const dragIndexRef = useRef(null)
  const frameRef = useRef(null)

  const [cv, setCv] = useState(null)
  const [cvStatus, setCvStatus] = useState('loading')
  const [room, setRoom] = useState(ROOMS[0])
  const [tile, setTile] = useState(TILES[0])
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 })
  const [points, setPoints] = useState([])
  const [imageVersion, setImageVersion] = useState(0)
  const [tileVersion, setTileVersion] = useState(0)
  const [tileScale, setTileScale] = useState(124)
  const [opacity, setOpacity] = useState(82)
  const [blendMode, setBlendMode] = useState('multiply')
  const [showPoints, setShowPoints] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    let active = true
    getOpenCv()
      .then((loadedCv) => {
        if (!active) return
        setCv(loadedCv)
        setCvStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setCvStatus('error')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, MAX_CANVAS_WIDTH / image.naturalWidth)
      const width = Math.round(image.naturalWidth * scale)
      const height = Math.round(image.naturalHeight * scale)
      imageRef.current = image
      setCanvasSize({ width, height })
      setPoints(makeDefaultPoints(room, width, height))
      setImageVersion((version) => version + 1)
    }
    image.src = room.src
  }, [room])

  useEffect(() => {
    const image = new Image()
    image.onload = () => {
      tileImageRef.current = image
      setTileVersion((version) => version + 1)
    }
    image.src = tile.src
  }, [tile])

  useEffect(() => () => {
    if (uploadedRoomUrlRef.current) URL.revokeObjectURL(uploadedRoomUrlRef.current)
    if (uploadedTileUrlRef.current) URL.revokeObjectURL(uploadedTileUrlRef.current)
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  const renderScene = useCallback(() => {
    const canvas = canvasRef.current
    const roomImage = imageRef.current
    if (!canvas || !roomImage || canvasSize.width <= 1) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(roomImage, 0, 0, canvas.width, canvas.height)

    const tileImage = tileImageRef.current
    if (!cv || !tileImage || points.length !== 4) return

    const textureSize = 1024
    const textureCanvas = document.createElement('canvas')
    textureCanvas.width = textureSize
    textureCanvas.height = textureSize
    const textureContext = textureCanvas.getContext('2d')
    textureContext.fillStyle = '#d7d3c9'
    textureContext.fillRect(0, 0, textureSize, textureSize)

    const aspect = clamp(tileImage.naturalWidth / tileImage.naturalHeight, 0.48, 2.1)
    const cellWidth = Math.max(28, tileScale * Math.sqrt(aspect))
    const cellHeight = Math.max(28, tileScale / Math.sqrt(aspect))
    const grout = Math.max(2, tileScale * 0.025)

    for (let y = -cellHeight; y < textureSize + cellHeight; y += cellHeight) {
      for (let x = -cellWidth; x < textureSize + cellWidth; x += cellWidth) {
        drawCover(
          textureContext,
          tileImage,
          x + grout,
          y + grout,
          cellWidth - grout * 2,
          cellHeight - grout * 2,
        )
      }
    }

    let sourceMat
    let warpedMat
    let sourcePoints
    let destinationPoints
    let transform

    try {
      sourceMat = cv.imread(textureCanvas)
      warpedMat = new cv.Mat.zeros(canvas.height, canvas.width, cv.CV_8UC4)
      sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        textureSize - 1, 0,
        textureSize - 1, textureSize - 1,
        0, textureSize - 1,
      ])
      destinationPoints = cv.matFromArray(
        4,
        1,
        cv.CV_32FC2,
        points.flatMap(({ x, y }) => [x, y]),
      )
      transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints)
      cv.warpPerspective(
        sourceMat,
        warpedMat,
        transform,
        new cv.Size(canvas.width, canvas.height),
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar(0, 0, 0, 0),
      )

      const warpedCanvas = document.createElement('canvas')
      cv.imshow(warpedCanvas, warpedMat)
      context.save()
      context.globalAlpha = opacity / 100
      context.globalCompositeOperation = blendMode
      context.drawImage(warpedCanvas, 0, 0)
      context.restore()
    } finally {
      sourceMat?.delete()
      warpedMat?.delete()
      sourcePoints?.delete()
      destinationPoints?.delete()
      transform?.delete()
    }
  }, [blendMode, canvasSize, cv, opacity, points, tileScale])

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(renderScene)
    return () => cancelAnimationFrame(frameRef.current)
  }, [imageVersion, renderScene, tileVersion])

  const resetPoints = useCallback(() => {
    setPoints(makeDefaultPoints(room, canvasSize.width, canvasSize.height))
  }, [canvasSize, room])

  const updatePointFromEvent = useCallback((index, event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const bounds = canvas.getBoundingClientRect()
    const x = clamp(
      ((event.clientX - bounds.left) / bounds.width) * canvasSize.width,
      0,
      canvasSize.width,
    )
    const y = clamp(
      ((event.clientY - bounds.top) / bounds.height) * canvasSize.height,
      0,
      canvasSize.height,
    )
    setPoints((current) => current.map((point, pointIndex) => (
      pointIndex === index ? { x, y } : point
    )))
  }, [canvasSize])

  const handlePointDown = (index, event) => {
    dragIndexRef.current = index
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePointFromEvent(index, event)
  }

  const handlePointMove = (event) => {
    if (dragIndexRef.current === null) return
    updatePointFromEvent(dragIndexRef.current, event)
  }

  const endPointDrag = (event) => {
    if (dragIndexRef.current === null) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragIndexRef.current = null
    setIsDragging(false)
  }

  const handlePointKeyDown = (index, event) => {
    const movement = event.shiftKey ? 10 : 2
    const deltas = {
      ArrowLeft: [-movement, 0],
      ArrowRight: [movement, 0],
      ArrowUp: [0, -movement],
      ArrowDown: [0, movement],
    }
    if (!deltas[event.key]) return
    event.preventDefault()
    const [dx, dy] = deltas[event.key]
    setPoints((current) => current.map((point, pointIndex) => (
      pointIndex === index
        ? {
            x: clamp(point.x + dx, 0, canvasSize.width),
            y: clamp(point.y + dy, 0, canvasSize.height),
          }
        : point
    )))
  }

  const handleUpload = (type, event) => {
    const [file] = event.target.files
    if (!file) return
    const url = URL.createObjectURL(file)

    if (type === 'room') {
      if (uploadedRoomUrlRef.current) URL.revokeObjectURL(uploadedRoomUrlRef.current)
      uploadedRoomUrlRef.current = url
      setRoom({
        id: 'room-' + Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        src: url,
        points: [[0.2, 0.18], [0.78, 0.18], [0.76, 0.82], [0.22, 0.82]],
      })
    } else {
      if (uploadedTileUrlRef.current) URL.revokeObjectURL(uploadedTileUrlRef.current)
      uploadedTileUrlRef.current = url
      setTile({
        id: 'tile-' + Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        code: 'CUSTOM',
        src: url,
      })
    }
    event.target.value = ''
  }

  const pointString = useMemo(
    () => points.map(({ x, y }) => x + ',' + y).join(' '),
    [points],
  )

  const selectedSampleRoom = ROOMS.some(({ id }) => id === room.id)

  return (
    <div className="visualizer-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <span /><span /><span /><span />
          </span>
          <div>
            <div className="brand-name">TileStudio</div>
            <div className="brand-caption">Perspective visualizer</div>
          </div>
        </div>

        <div className="topbar-actions">
          <div className={'engine-status engine-status--' + cvStatus}>
            <span className="status-dot" />
            {cvStatus === 'ready' ? 'OpenCV ready' : cvStatus === 'error' ? 'OpenCV unavailable' : 'Loading engine'}
          </div>
          <label className="room-picker">
            <span>Room</span>
            <select
              value={selectedSampleRoom ? room.id : ''}
              onChange={(event) => {
                const nextRoom = ROOMS.find(({ id }) => id === event.target.value)
                if (nextRoom) setRoom(nextRoom)
              }}
              aria-label="Choose a sample room"
            >
              {!selectedSampleRoom && <option value="">Custom room</option>}
              {ROOMS.map((sampleRoom) => (
                <option key={sampleRoom.id} value={sampleRoom.id}>{sampleRoom.name}</option>
              ))}
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={() => roomUploadRef.current?.click()}>
            <Icon name="upload" />
            <span>Upload room</span>
          </button>
          <button className="icon-button" type="button" onClick={resetPoints} title="Reset corner points" aria-label="Reset corner points">
            <Icon name="reset" />
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="material-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Collection</p>
              <h1>Tile library</h1>
            </div>
            <button className="mini-button" type="button" onClick={() => tileUploadRef.current?.click()} aria-label="Upload a custom tile">
              <Icon name="upload" size={16} />
            </button>
          </div>
          <p className="panel-copy">Choose a finish to preview it on the selected surface.</p>

          <div className="tile-grid" aria-label="Available tile samples">
            {TILES.map((sampleTile) => (
              <button
                className={'tile-card ' + (tile.id === sampleTile.id ? 'tile-card--active' : '')}
                key={sampleTile.id}
                type="button"
                onClick={() => setTile(sampleTile)}
                aria-pressed={tile.id === sampleTile.id}
              >
                <span className="tile-thumb-wrap">
                  <img src={sampleTile.src} alt="" className="tile-thumb" />
                  {tile.id === sampleTile.id && <span className="tile-check"><Icon name="check" size={13} /></span>}
                </span>
                <span className="tile-meta">
                  <strong>{sampleTile.name}</strong>
                  <small>#{sampleTile.code}</small>
                </span>
              </button>
            ))}
          </div>

          <button className="upload-tile-button" type="button" onClick={() => tileUploadRef.current?.click()}>
            <Icon name="upload" /> Upload your own tile
          </button>
        </aside>

        <section className="stage" aria-label="Tile preview workspace">
          <div className="stage-heading">
            <div>
              <p className="eyebrow">Live preview</p>
              <h2>{room.name}</h2>
            </div>
            <div className="stage-hint">
              <span className="hint-number">4</span>
              Drag the points to trace the wall
            </div>
          </div>

          <div className="canvas-frame">
            <div
              className={'canvas-wrap ' + (isDragging ? 'canvas-wrap--dragging' : '')}
              style={{
                aspectRatio: canvasSize.width + ' / ' + canvasSize.height,
                '--canvas-ratio': canvasSize.width / canvasSize.height,
              }}
            >
              <canvas ref={canvasRef} aria-label="Room with perspective tile preview" />

              {showPoints && points.length === 4 && (
                <svg
                  className="point-guides"
                  viewBox={'0 0 ' + canvasSize.width + ' ' + canvasSize.height}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polygon points={pointString} />
                </svg>
              )}

              {showPoints && points.map((point, index) => (
                <button
                  className="control-point"
                  key={index}
                  type="button"
                  style={{
                    left: ((point.x / canvasSize.width) * 100) + '%',
                    top: ((point.y / canvasSize.height) * 100) + '%',
                  }}
                  aria-label={'Wall corner ' + (index + 1)}
                  onPointerDown={(event) => handlePointDown(index, event)}
                  onPointerMove={handlePointMove}
                  onPointerUp={endPointDrag}
                  onPointerCancel={endPointDrag}
                  onKeyDown={(event) => handlePointKeyDown(index, event)}
                >
                  <span>{index + 1}</span>
                </button>
              ))}

              {cvStatus === 'loading' && (
                <div className="canvas-loading"><span className="spinner" /> Preparing perspective engine…</div>
              )}
              {cvStatus === 'error' && (
                <div className="canvas-loading canvas-loading--error">OpenCV could not be initialized.</div>
              )}

              <div className="canvas-caption">
                <Icon name="sparkle" size={16} />
                Perspective mapped with OpenCV
              </div>
            </div>
          </div>

          <div className="surface-controls">
            <div className="selected-material">
              <img src={tile.src} alt="" />
              <div>
                <span>Selected material</span>
                <strong>{tile.name}</strong>
              </div>
            </div>

            <label className="slider-control">
              <span><b>Tile size</b><output>{Math.round((tileScale / 124) * 100)}%</output></span>
              <input
                type="range"
                min="54"
                max="230"
                value={tileScale}
                onChange={(event) => setTileScale(Number(event.target.value))}
                style={{ '--range-progress': (((tileScale - 54) / 176) * 100) + '%' }}
              />
            </label>

            <label className="slider-control">
              <span><b>Opacity</b><output>{opacity}%</output></span>
              <input
                type="range"
                min="20"
                max="100"
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                style={{ '--range-progress': (((opacity - 20) / 80) * 100) + '%' }}
              />
            </label>

            <label className="blend-control">
              <span>Finish</span>
              <select value={blendMode} onChange={(event) => setBlendMode(event.target.value)}>
                <option value="multiply">Natural</option>
                <option value="source-over">True color</option>
                <option value="soft-light">Soft light</option>
              </select>
            </label>

            <button className="points-button" type="button" onClick={() => setShowPoints((visible) => !visible)}>
              <Icon name={showPoints ? 'eyeOff' : 'eye'} />
              {showPoints ? 'Hide points' : 'Show points'}
            </button>
          </div>
        </section>
      </main>

      <input ref={roomUploadRef} className="file-input" type="file" accept="image/*" onChange={(event) => handleUpload('room', event)} />
      <input ref={tileUploadRef} className="file-input" type="file" accept="image/*" onChange={(event) => handleUpload('tile', event)} />
    </div>
  )
}

export default TileVisualizer

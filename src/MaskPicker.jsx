import { useEffect, useRef, useState } from 'react'
import cvModule from '@techstark/opencv-js'
import './MaskPicker.css'

import tile01 from './assets/img/tiles/2000000600727 Tile.jpg'
import tile02 from './assets/img/tiles/2000000591766 Tile.jpg'
import tile03 from './assets/img/tiles/2000000503004 Tile.jpg'
import tile04 from './assets/img/tiles/2000000432168 Tile.jpg'

const TILES = [
  { id: 'ivory', name: 'Ivory Vein', src: tile01 },
  { id: 'cloud', name: 'Cloud Marble', src: tile02 },
  { id: 'sand', name: 'Warm Sand', src: tile03 },
  { id: 'terrazzo', name: 'Soft Terrazzo', src: tile04 },
]

let openCvPromise

function getOpenCv() {
  if (openCvPromise) return openCvPromise

  openCvPromise = (async () => {
    if (cvModule instanceof Promise) return cvModule
    if (cvModule.Mat) return cvModule

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('OpenCV စတင်ရန် အချိန်ကြာနေပါသည်။')),
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
    image.onerror = () => reject(new Error('Image ကိုဖွင့်၍မရပါ။'))
    image.src = source
  })
}

function orderCorners(points) {
  const bySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y))
  const topLeft = bySum[0]
  const bottomRight = bySum[bySum.length - 1]
  const remaining = points.filter((point) => point !== topLeft && point !== bottomRight)
  const [topRight, bottomLeft] = remaining[0].x > remaining[1].x
    ? [remaining[0], remaining[1]]
    : [remaining[1], remaining[0]]

  return [topLeft, topRight, bottomRight, bottomLeft]
}

function findPerspectiveCorners(cv, maskCanvas) {
  let source
  let gray
  let binary
  let kernel
  let contours
  let hierarchy
  let hull
  let approximation
  let largestContour

  try {
    source = cv.imread(maskCanvas)
    gray = new cv.Mat()
    binary = new cv.Mat()
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY)
    cv.threshold(gray, binary, 127, 255, cv.THRESH_BINARY)

    kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11))
    cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel)

    contours = new cv.MatVector()
    hierarchy = new cv.Mat()
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    if (contours.size() === 0) throw new Error('Mask contour မတွေ့ပါ။')

    let largestIndex = 0
    let largestArea = 0
    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index)
      const area = cv.contourArea(contour)
      contour.delete()
      if (area > largestArea) {
        largestArea = area
        largestIndex = index
      }
    }

    if (largestArea < maskCanvas.width * maskCanvas.height * 0.005) {
      throw new Error('Mask area သေးလွန်းပါသည်။')
    }

    largestContour = contours.get(largestIndex)
    hull = new cv.Mat()
    cv.convexHull(largestContour, hull)
    const perimeter = cv.arcLength(hull, true)
    let points = null

    for (let factor = 0.005; factor <= 0.12; factor += 0.0025) {
      approximation?.delete()
      approximation = new cv.Mat()
      cv.approxPolyDP(hull, approximation, perimeter * factor, true)
      if (approximation.rows === 4 && cv.isContourConvex(approximation)) {
        points = Array.from({ length: 4 }, (_, index) => ({
          x: approximation.data32S[index * 2],
          y: approximation.data32S[index * 2 + 1],
        }))
        break
      }
    }

    if (!points) {
      const hullPoints = Array.from({ length: hull.rows }, (_, index) => ({
        x: hull.data32S[index * 2],
        y: hull.data32S[index * 2 + 1],
      }))
      const candidates = [
        hullPoints.reduce((best, point) => point.x + point.y < best.x + best.y ? point : best),
        hullPoints.reduce((best, point) => point.x - point.y > best.x - best.y ? point : best),
        hullPoints.reduce((best, point) => point.x + point.y > best.x + best.y ? point : best),
        hullPoints.reduce((best, point) => point.x - point.y < best.x - best.y ? point : best),
      ]
      if (new Set(candidates.map(({ x, y }) => `${x},${y}`)).size !== 4) {
        throw new Error('Perspective corner ၄ ခုကို တိတိကျကျ မရှာနိုင်ပါ။')
      }
      points = candidates
    }

    return orderCorners(points)
  } finally {
    source?.delete()
    gray?.delete()
    binary?.delete()
    kernel?.delete()
    contours?.delete()
    hierarchy?.delete()
    largestContour?.delete()
    hull?.delete()
    approximation?.delete()
  }
}

function distance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function colorizeMask(source, width, height) {
  return new Promise((resolve, reject) => {
    const maskImage = new Image()

    maskImage.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width || maskImage.naturalWidth
        canvas.height = height || maskImage.naturalHeight
        const context = canvas.getContext('2d', { willReadFrequently: true })

        context.drawImage(maskImage, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

        for (let index = 0; index < imageData.data.length; index += 4) {
          const isSelected = imageData.data[index] > 127
          imageData.data[index] = 0
          imageData.data[index + 1] = 120
          imageData.data[index + 2] = 255
          imageData.data[index + 3] = isSelected ? 105 : 0
        }

        context.putImageData(imageData, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Mask overlay ကိုပြောင်း၍မရပါ။'))
        }, 'image/png')
      } catch (error) {
        reject(error)
      }
    }

    maskImage.onerror = () => reject(new Error('Mask image ကိုဖွင့်၍မရပါ။'))
    maskImage.src = source
  })
}

/**
 * Upload an image, choose a point and send it to a FastAPI mask endpoint.
 *
 * The endpoint is expected to accept multipart/form-data fields named
 * `image`, `x` and `y`. It may return either an image response or JSON.
 */
function MaskPicker({ apiUrl = '/api/mask', onMaskCreated }) {
  const imageRef = useRef(null)
  const requestRef = useRef(null)
  const previewUrlRef = useRef(null)
  const resultUrlRef = useRef(null)
  const tileOutputUrlRef = useRef(null)

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [point, setPoint] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [tile, setTile] = useState(TILES[0])
  const [tileOutputUrl, setTileOutputUrl] = useState('')
  const [corners, setCorners] = useState([])
  const [applyStatus, setApplyStatus] = useState('idle')

  const revokeResultUrl = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
  }

  const revokeTileOutputUrl = () => {
    if (tileOutputUrlRef.current) {
      URL.revokeObjectURL(tileOutputUrlRef.current)
      tileOutputUrlRef.current = null
    }
  }

  useEffect(() => () => {
    requestRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    if (tileOutputUrlRef.current) URL.revokeObjectURL(tileOutputUrlRef.current)
  }, [])

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return

    requestRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    revokeResultUrl()
    revokeTileOutputUrl()

    const nextPreviewUrl = URL.createObjectURL(nextFile)
    previewUrlRef.current = nextPreviewUrl
    setFile(nextFile)
    setPreviewUrl(nextPreviewUrl)
    setPoint(null)
    setResult(null)
    setTileOutputUrl('')
    setCorners([])
    setApplyStatus('idle')
    setError('')
    setStatus('idle')
    event.target.value = ''
  }

  const requestMask = async (x, y) => {
    const controller = new AbortController()
    requestRef.current?.abort()
    requestRef.current = controller

    const formData = new FormData()
    formData.append('image', file)
    formData.append('x', String(x))
    formData.append('y', String(y))

    setStatus('loading')
    setError('')
    revokeResultUrl()
    revokeTileOutputUrl()
    setResult(null)
    setTileOutputUrl('')
    setCorners([])
    setApplyStatus('idle')

    try {
      const response = await fetch(apiUrl, {
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
          // The error response was not JSON; keep the status-based message.
        }
        throw new Error(message)
      }

      const contentType = response.headers.get('content-type') || ''
      let nextResult

      if (contentType.includes('application/json')) {
        const data = await response.json()
        const imageUrl = data.mask_url || data.image_url || data.url

        if (data.mask) {
          const maskSource = data.mask.startsWith('data:')
            ? data.mask
            : `data:image/png;base64,${data.mask}`
          const overlayBlob = await colorizeMask(
            maskSource,
            data.image_width,
            data.image_height,
          )
          const overlayUrl = URL.createObjectURL(overlayBlob)
          resultUrlRef.current = overlayUrl
          nextResult = {
            type: 'image',
            url: overlayUrl,
            data,
            colorized: true,
            maskSource,
          }
        } else {
          nextResult = imageUrl
            ? { type: 'image', url: imageUrl, data, maskSource: imageUrl }
            : { type: 'json', data }
        }
      } else {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        resultUrlRef.current = url
        nextResult = { type: 'image', url, blob, maskSource: url }
      }

      setResult(nextResult)
      setStatus('success')
      onMaskCreated?.({ x, y, file, result: nextResult })
    } catch (requestError) {
      if (requestError.name === 'AbortError') return
      setError(requestError.message || 'Mask ဖန်တီး၍ မရပါ။')
      setStatus('error')
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  const selectPoint = (clientX, clientY) => {
    const image = imageRef.current
    if (!file || !image) return

    const bounds = image.getBoundingClientRect()
    if (
      clientX < bounds.left ||
      clientX > bounds.right ||
      clientY < bounds.top ||
      clientY > bounds.bottom
    ) return

    const x = Math.max(
      0,
      Math.min(
        image.naturalWidth - 1,
        Math.floor(((clientX - bounds.left) / bounds.width) * image.naturalWidth),
      ),
    )
    const y = Math.max(
      0,
      Math.min(
        image.naturalHeight - 1,
        Math.floor(((clientY - bounds.top) / bounds.height) * image.naturalHeight),
      ),
    )

    setPoint({
      x,
      y,
      left: ((clientX - bounds.left) / bounds.width) * 100,
      top: ((clientY - bounds.top) / bounds.height) * 100,
    })
    requestMask(x, y)
  }

  const handleImageClick = (event) => {
    selectPoint(event.clientX, event.clientY)
  }

  const handleImageKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    const bounds = imageRef.current.getBoundingClientRect()
    selectPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
  }

  const applyTile = async () => {
    if (!result?.maskSource) {
      setError('Tile မခင်းခင် wall mask တစ်ခုရွေးပါ။')
      return
    }

    setApplyStatus('loading')
    setError('')

    let sourceMat
    let warpedMat
    let sourcePoints
    let destinationPoints
    let transform

    try {
      const [cv, maskImage, tileImage] = await Promise.all([
        getOpenCv(),
        loadImage(result.maskSource),
        loadImage(tile.src),
      ])
      const originalImage = imageRef.current
      const scale = Math.min(1, 1600 / originalImage.naturalWidth)
      const outputWidth = Math.max(1, Math.round(originalImage.naturalWidth * scale))
      const outputHeight = Math.max(1, Math.round(originalImage.naturalHeight * scale))

      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = outputWidth
      maskCanvas.height = outputHeight
      maskCanvas.getContext('2d').drawImage(maskImage, 0, 0, outputWidth, outputHeight)

      const nextCorners = findPerspectiveCorners(cv, maskCanvas)
      const [topLeft, topRight, bottomRight, bottomLeft] = nextCorners
      const textureWidth = Math.round(Math.max(
        256,
        Math.min(1600, (distance(topLeft, topRight) + distance(bottomLeft, bottomRight)) / 2),
      ))
      const textureHeight = Math.round(Math.max(
        256,
        Math.min(1600, (distance(topLeft, bottomLeft) + distance(topRight, bottomRight)) / 2),
      ))

      const textureCanvas = document.createElement('canvas')
      textureCanvas.width = textureWidth
      textureCanvas.height = textureHeight
      const textureContext = textureCanvas.getContext('2d')
      const tileSize = Math.max(72, Math.min(180, Math.round(Math.min(textureWidth, textureHeight) / 5)))
      const tileAspect = tileImage.naturalWidth / tileImage.naturalHeight
      const cellWidth = tileSize * Math.sqrt(tileAspect)
      const cellHeight = tileSize / Math.sqrt(tileAspect)
      const grout = Math.max(2, tileSize * 0.025)

      textureContext.fillStyle = '#d9d5cb'
      textureContext.fillRect(0, 0, textureWidth, textureHeight)
      for (let y = 0; y < textureHeight + cellHeight; y += cellHeight) {
        for (let x = 0; x < textureWidth + cellWidth; x += cellWidth) {
          textureContext.drawImage(
            tileImage,
            x + grout,
            y + grout,
            cellWidth - grout * 2,
            cellHeight - grout * 2,
          )
        }
      }

      sourceMat = cv.imread(textureCanvas)
      warpedMat = cv.Mat.zeros(outputHeight, outputWidth, cv.CV_8UC4)
      sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        textureWidth - 1, 0,
        textureWidth - 1, textureHeight - 1,
        0, textureHeight - 1,
      ])
      destinationPoints = cv.matFromArray(
        4,
        1,
        cv.CV_32FC2,
        nextCorners.flatMap(({ x, y }) => [x, y]),
      )
      transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints)
      cv.warpPerspective(
        sourceMat,
        warpedMat,
        transform,
        new cv.Size(outputWidth, outputHeight),
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar(0, 0, 0, 0),
      )

      const outputCanvas = document.createElement('canvas')
      cv.imshow(outputCanvas, warpedMat)
      const outputBlob = await new Promise((resolve, reject) => {
        outputCanvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Tile preview ကိုဖန်တီး၍မရပါ။'))
        }, 'image/png')
      })

      revokeTileOutputUrl()
      const outputUrl = URL.createObjectURL(outputBlob)
      tileOutputUrlRef.current = outputUrl
      setTileOutputUrl(outputUrl)
      setCorners(nextCorners.map(({ x, y }) => ({
        x: (x / outputWidth) * 100,
        y: (y / outputHeight) * 100,
      })))
      setApplyStatus('success')
    } catch (applyError) {
      setApplyStatus('error')
      setError(applyError.message || 'Perspective tile ကိုဖန်တီး၍မရပါ။')
    } finally {
      sourceMat?.delete()
      warpedMat?.delete()
      sourcePoints?.delete()
      destinationPoints?.delete()
      transform?.delete()
    }
  }

  return (
    <section className="mask-picker">
      <div className="mask-picker__heading">
        <div>
          <p className="mask-picker__eyebrow">AI mask</p>
          <h2>ဓာတ်ပုံထဲက နေရာတစ်ခုရွေးပါ</h2>
          <p>ပုံတင်ပြီး mask လုပ်လိုတဲ့နေရာကို နှိပ်ပါ။</p>
        </div>

        <label className="mask-picker__upload">
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {file ? 'ပုံပြောင်းရန်' : 'ပုံရွေးရန်'}
        </label>
      </div>

      {!previewUrl ? (
        <label className="mask-picker__empty">
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <span className="mask-picker__empty-icon" aria-hidden="true">+</span>
          <strong>Upload image</strong>
          <small>JPG, PNG သို့မဟုတ် WEBP</small>
        </label>
      ) : (
        <div className={`mask-picker__grid ${result?.type === 'json' ? '' : 'mask-picker__grid--preview-only'}`}>
          <div>
            <div
              className="mask-picker__image-wrap"
              role="button"
              tabIndex="0"
              onClick={handleImageClick}
              onKeyDown={handleImageKeyDown}
              aria-label="Select a point on the image"
            >
              <img ref={imageRef} src={previewUrl} alt="Uploaded preview" />
              {result?.type === 'image' && (
                <img
                  className={`mask-picker__mask-overlay ${result.colorized ? 'mask-picker__mask-overlay--colorized' : ''}`}
                  src={result.url}
                  alt=""
                  aria-hidden="true"
                  style={{ display: tileOutputUrl ? 'none' : undefined }}
                />
              )}
              {tileOutputUrl && (
                <img
                  className="mask-picker__tile-overlay"
                  src={tileOutputUrl}
                  alt="Perspective tile preview"
                />
              )}
              {corners.map((corner, index) => (
                <span
                  className="mask-picker__corner"
                  key={index}
                  style={{ left: `${corner.x}%`, top: `${corner.y}%` }}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
              ))}
              {point && (
                <span
                  className="mask-picker__point"
                  style={{ left: `${point.left}%`, top: `${point.top}%` }}
                  aria-hidden="true"
                />
              )}
              {(status === 'loading' || applyStatus === 'loading') && (
                <span className="mask-picker__loading">
                  {applyStatus === 'loading' ? 'Perspective တွက်နေသည်…' : 'Mask ဖန်တီးနေသည်…'}
                </span>
              )}
            </div>
            <div className="mask-picker__meta">
              <span>{file.name}</span>
              <span>{point ? `x: ${point.x}, y: ${point.y}` : 'ပုံပေါ်တွင် နှိပ်ပါ'}</span>
            </div>
            {error && <p className="mask-picker__error" role="alert">{error}</p>}

            {result?.maskSource && (
              <div className="mask-picker__tile-tools">
                <div className="mask-picker__tile-heading">
                  <div>
                    <strong>Tile ရွေးပါ</strong>
                    <span>ရွေးပြီး Apply tile ကိုနှိပ်ပါ</span>
                  </div>
                  <button
                    type="button"
                    className="mask-picker__apply"
                    onClick={applyTile}
                    disabled={applyStatus === 'loading'}
                  >
                    {applyStatus === 'loading' ? 'Applying…' : 'Apply tile'}
                  </button>
                </div>

                <div className="mask-picker__tiles">
                  {TILES.map((sample) => (
                    <button
                      type="button"
                      className={`mask-picker__tile ${tile.id === sample.id ? 'mask-picker__tile--active' : ''}`}
                      key={sample.id}
                      onClick={() => {
                        setTile(sample)
                        revokeTileOutputUrl()
                        setTileOutputUrl('')
                        setCorners([])
                        setApplyStatus('idle')
                      }}
                      aria-pressed={tile.id === sample.id}
                    >
                      <img src={sample.src} alt="" />
                      <span>{sample.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result?.type === 'json' && (
            <div className="mask-picker__result">
              <p>Mask result</p>
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default MaskPicker

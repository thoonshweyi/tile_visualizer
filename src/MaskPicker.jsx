import { useEffect, useRef, useState } from 'react'
import cvModule from '@techstark/opencv-js'
import './MaskPicker.css'

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

  return [
    ...clockwise.slice(topLeftIndex),
    ...clockwise.slice(0, topLeftIndex),
  ]
}

function distance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image ကိုဖွင့်၍မရပါ။'))
    image.src = source
  })
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
  const tileUrlRef = useRef(null)
  const tileCanvasRef = useRef(null)
  const dragPointRef = useRef(null)

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [point, setPoint] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [tileFile, setTileFile] = useState(null)
  const [tileUrl, setTileUrl] = useState('')
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 })
  const [perspectivePoints, setPerspectivePoints] = useState([])
  const [isApplying, setIsApplying] = useState(false)
  const [tileApplied, setTileApplied] = useState(false)

  const revokeResultUrl = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
  }

  const clearTilePreview = () => {
    const canvas = tileCanvasRef.current
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }
    setTileApplied(false)
  }

  useEffect(() => () => {
    requestRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    if (tileUrlRef.current) URL.revokeObjectURL(tileUrlRef.current)
  }, [])

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return

    requestRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    revokeResultUrl()

    const nextPreviewUrl = URL.createObjectURL(nextFile)
    previewUrlRef.current = nextPreviewUrl
    setFile(nextFile)
    setPreviewUrl(nextPreviewUrl)
    setImageSize({ width: 1, height: 1 })
    setPoint(null)
    setResult(null)
    setPerspectivePoints([])
    clearTilePreview()
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
    setResult(null)
    setPerspectivePoints([])
    clearTilePreview()

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
      setPerspectivePoints([])
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

  const getPerspectivePoint = (clientX, clientY) => {
    const image = imageRef.current
    if (!image) return null

    const bounds = image.getBoundingClientRect()
    if (
      clientX < bounds.left ||
      clientX > bounds.right ||
      clientY < bounds.top ||
      clientY > bounds.bottom
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

  const handleImageClick = (event) => {
    if (result?.maskSource) {
      const nextPoint = getPerspectivePoint(event.clientX, event.clientY)
      if (!nextPoint) return

      setPerspectivePoints((current) => {
        if (current.length >= 4) return current
        const nextPoints = [...current, nextPoint]
        return nextPoints.length === 4 ? orderPoints(nextPoints) : nextPoints
      })
      clearTilePreview()
      return
    }

    selectPoint(event.clientX, event.clientY)
  }

  const handleImageKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (result?.maskSource) return
    const bounds = imageRef.current.getBoundingClientRect()
    selectPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
  }

  const handlePerspectivePointDown = (index, event) => {
    event.stopPropagation()
    dragPointRef.current = index
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePerspectivePointMove = (event) => {
    if (dragPointRef.current === null) return
    event.stopPropagation()
    const nextPoint = getPerspectivePoint(event.clientX, event.clientY)
    if (!nextPoint) return

    const pointIndex = dragPointRef.current
    setPerspectivePoints((current) => current.map((currentPoint, index) => (
      index === pointIndex ? nextPoint : currentPoint
    )))
    clearTilePreview()
  }

  const handlePerspectivePointUp = (event) => {
    if (dragPointRef.current === null) return
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragPointRef.current = null
    setPerspectivePoints((current) => (
      current.length === 4 ? orderPoints(current) : current
    ))
  }

  const handleTileChange = (event) => {
    const nextTile = event.target.files?.[0]
    if (!nextTile) return

    if (tileUrlRef.current) URL.revokeObjectURL(tileUrlRef.current)
    const nextTileUrl = URL.createObjectURL(nextTile)
    tileUrlRef.current = nextTileUrl
    setTileFile(nextTile)
    setTileUrl(nextTileUrl)
    clearTilePreview()
    setError('')
    event.target.value = ''
  }

  const applyPerspectiveTile = async () => {
    if (!tileUrl || !result?.maskSource || perspectivePoints.length !== 4) {
      setError('Tile၊ mask နဲ့ perspective point ၄ ခုလိုအပ်ပါတယ်။')
      return
    }

    setIsApplying(true)
    setError('')

    let tileMat
    let warpedMat
    let sourcePoints
    let destinationPoints
    let transform

    try {
      const [cv, tileImage, maskImage] = await Promise.all([
        getOpenCv(),
        loadImage(tileUrl),
        loadImage(result.maskSource),
      ])
      const image = imageRef.current
      const canvas = tileCanvasRef.current
      const width = image.naturalWidth
      const height = image.naturalHeight
      const [topLeft, topRight, bottomRight, bottomLeft] = orderPoints(perspectivePoints)

      // Target quad နဲ့အရွယ်နီးတဲ့ repeated texture တစ်ခုတည်ဆောက်မယ်။
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

      // OpenCV result ကို visible overlay canvas ပေါ်တင်မယ်။
      cv.imshow(canvas, warpedMat)

      // Raw AI mask ကို alpha mask ပြောင်းပြီး boundary အပြင် tile ကိုဖြတ်မယ်။
      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = width
      maskCanvas.height = height
      const maskContext = maskCanvas.getContext('2d', {
        willReadFrequently: true,
      })
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

      setPerspectivePoints([topLeft, topRight, bottomRight, bottomLeft].map((item) => ({
        ...item,
        left: (item.x / width) * 100,
        top: (item.y / height) * 100,
      })))
      setTileApplied(true)
    } catch (applyError) {
      setError(applyError.message || 'Perspective tile ကိုဖန်တီး၍မရပါ။')
      clearTilePreview()
    } finally {
      tileMat?.delete()
      warpedMat?.delete()
      sourcePoints?.delete()
      destinationPoints?.delete()
      transform?.delete()
      setIsApplying(false)
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
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Uploaded preview"
                onLoad={(event) => setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
              />
              {result?.type === 'image' && !tileApplied && (
                <img
                  className={`mask-picker__mask-overlay ${result.colorized ? 'mask-picker__mask-overlay--colorized' : ''}`}
                  src={result.url}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <canvas
                ref={tileCanvasRef}
                className="mask-picker__tile-pattern"
                aria-hidden="true"
              />
              {perspectivePoints.length > 1 && (
                <svg
                  className="mask-picker__point-guides"
                  viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {perspectivePoints.length === 4 ? (
                    <polygon points={perspectivePoints.map(({ x, y }) => `${x},${y}`).join(' ')} />
                  ) : (
                    <polyline points={perspectivePoints.map(({ x, y }) => `${x},${y}`).join(' ')} />
                  )}
                </svg>
              )}
              {perspectivePoints.map((perspectivePoint, index) => (
                <button
                  className="mask-picker__perspective-point"
                  key={index}
                  type="button"
                  style={{
                    left: `${perspectivePoint.left}%`,
                    top: `${perspectivePoint.top}%`,
                  }}
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
              {point && !result?.maskSource && (
                <span
                  className="mask-picker__point"
                  style={{ left: `${point.left}%`, top: `${point.top}%` }}
                  aria-hidden="true"
                />
              )}
              {(status === 'loading' || isApplying) && (
                <span className="mask-picker__loading">
                  {isApplying ? 'Perspective tile ခင်းနေသည်…' : 'Mask ဖန်တီးနေသည်…'}
                </span>
              )}
            </div>
            <div className="mask-picker__meta">
              <span>{file.name}</span>
              <span>
                {result?.maskSource
                  ? `Perspective points: ${perspectivePoints.length}/4`
                  : point ? `x: ${point.x}, y: ${point.y}` : 'ပုံပေါ်တွင် နှိပ်ပါ'}
              </span>
            </div>
            {error && <p className="mask-picker__error" role="alert">{error}</p>}
            {result?.maskSource && (
              <div className="mask-picker__tile-control">
                <div>
                  <strong>Tile pattern</strong>
                  <span>
                    {perspectivePoints.length < 4
                      ? `ပုံပေါ်မှာ point ${4 - perspectivePoints.length} ခု ထပ်ရွေးပါ`
                      : 'Point တွေကို drag လုပ်ပြီး ပြင်နိုင်ပါတယ်'}
                  </span>
                </div>
                <div className="mask-picker__tile-actions">
                  {perspectivePoints.length > 0 && (
                    <button
                      className="mask-picker__secondary-action"
                      type="button"
                      onClick={() => {
                        setPerspectivePoints([])
                        clearTilePreview()
                      }}
                    >
                      Points ပြန်ရွေးရန်
                    </button>
                  )}
                  <label className="mask-picker__tile-upload">
                    <input type="file" accept="image/*" onChange={handleTileChange} />
                    {tileFile ? tileFile.name : 'Tile ရွေးရန်'}
                  </label>
                  <button
                    className="mask-picker__apply-tile"
                    type="button"
                    onClick={applyPerspectiveTile}
                    disabled={!tileUrl || perspectivePoints.length !== 4 || isApplying}
                  >
                    {isApplying ? 'Applying…' : 'Apply tile'}
                  </button>
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

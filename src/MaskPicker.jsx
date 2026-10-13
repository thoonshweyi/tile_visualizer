import { useEffect, useRef, useState } from 'react'
import './MaskPicker.css'

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

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [point, setPoint] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [tileFile, setTileFile] = useState(null)
  const [tileUrl, setTileUrl] = useState('')

  const revokeResultUrl = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
  }

  useEffect(() => () => {
    requestRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    if (tileUrlRef.current) URL.revokeObjectURL(tileUrlRef.current)
  }, [])

  useEffect(() => {
    const canvas = tileCanvasRef.current
    if (!canvas) return undefined

    const context = canvas.getContext('2d')
    const maskSource = result?.maskSource
    if (!tileUrl || !maskSource || !imageRef.current) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      return undefined
    }

    let cancelled = false

    async function drawTilePattern() {
      try {
        const [tileImage, maskImage] = await Promise.all([
          loadImage(tileUrl),
          loadImage(maskSource),
        ])
        if (cancelled) return

        const width = imageRef.current.naturalWidth
        const height = imageRef.current.naturalHeight
        canvas.width = width
        canvas.height = height

        // Tile ကိုအရွယ်သေးအောင်ညှိပြီး canvas အပြည့် repeat လုပ်မယ်။
        const tileCell = document.createElement('canvas')
        const tileSize = 120
        const tileRatio = tileImage.naturalWidth / tileImage.naturalHeight
        tileCell.width = tileSize
        tileCell.height = Math.round(tileSize / tileRatio)
        tileCell.getContext('2d').drawImage(
          tileImage,
          0,
          0,
          tileCell.width,
          tileCell.height,
        )

        context.globalCompositeOperation = 'source-over'
        context.clearRect(0, 0, width, height)
        context.fillStyle = context.createPattern(tileCell, 'repeat')
        context.fillRect(0, 0, width, height)

        // Black/white AI mask ကို alpha mask အဖြစ်ပြောင်းမယ်။
        const maskCanvas = document.createElement('canvas')
        maskCanvas.width = width
        maskCanvas.height = height
        const maskContext = maskCanvas.getContext('2d', {
          willReadFrequently: true,
        })
        maskContext.drawImage(maskImage, 0, 0, width, height)

        const pixels = maskContext.getImageData(0, 0, width, height)
        for (let index = 0; index < pixels.data.length; index += 4) {
          const isInsideMask = pixels.data[index] > 127
          pixels.data[index] = 255
          pixels.data[index + 1] = 255
          pixels.data[index + 2] = 255
          pixels.data[index + 3] = isInsideMask ? 255 : 0
        }
        maskContext.putImageData(pixels, 0, 0)

        // Mask အတွင်းမှာပဲ tile pattern ကိုချန်ထားမယ်။
        context.globalCompositeOperation = 'destination-in'
        context.drawImage(maskCanvas, 0, 0)
        context.globalCompositeOperation = 'source-over'
      } catch (tileError) {
        if (!cancelled) setError(tileError.message)
      }
    }

    drawTilePattern()
    return () => {
      cancelled = true
    }
  }, [result, tileUrl])

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
    setPoint(null)
    setResult(null)
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

  const handleTileChange = (event) => {
    const nextTile = event.target.files?.[0]
    if (!nextTile) return

    if (tileUrlRef.current) URL.revokeObjectURL(tileUrlRef.current)
    const nextTileUrl = URL.createObjectURL(nextTile)
    tileUrlRef.current = nextTileUrl
    setTileFile(nextTile)
    setTileUrl(nextTileUrl)
    setError('')
    event.target.value = ''
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
              {result?.type === 'image' && !tileUrl && (
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
              {point && (
                <span
                  className="mask-picker__point"
                  style={{ left: `${point.left}%`, top: `${point.top}%` }}
                  aria-hidden="true"
                />
              )}
              {status === 'loading' && (
                <span className="mask-picker__loading">Mask ဖန်တီးနေသည်…</span>
              )}
            </div>
            <div className="mask-picker__meta">
              <span>{file.name}</span>
              <span>{point ? `x: ${point.x}, y: ${point.y}` : 'ပုံပေါ်တွင် နှိပ်ပါ'}</span>
            </div>
            {error && <p className="mask-picker__error" role="alert">{error}</p>}
            {result?.maskSource && (
              <div className="mask-picker__tile-control">
                <div>
                  <strong>Tile pattern</strong>
                  <span>{tileFile ? tileFile.name : 'Tile image တစ်ပုံရွေးပါ'}</span>
                </div>
                <label className="mask-picker__tile-upload">
                  <input type="file" accept="image/*" onChange={handleTileChange} />
                  {tileFile ? 'Tile ပြောင်းရန်' : 'Tile ရွေးရန်'}
                </label>
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

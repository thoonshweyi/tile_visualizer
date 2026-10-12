import { useEffect, useRef, useState } from 'react'
import './MaskPicker.css'

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

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [point, setPoint] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

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
        nextResult = imageUrl
          ? { type: 'image', url: imageUrl, data }
          : { type: 'json', data }
      } else {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        resultUrlRef.current = url
        nextResult = { type: 'image', url, blob }
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
        <div className="mask-picker__grid">
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
          </div>

          <div className="mask-picker__result">
            <p>Mask result</p>
            {result?.type === 'image' ? (
              <img src={result.url} alt="Generated mask" />
            ) : result?.type === 'json' ? (
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            ) : (
              <div className="mask-picker__result-empty">
                {status === 'loading' ? 'Processing…' : 'Result ကို ဒီနေရာမှာ ပြပါမယ်။'}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default MaskPicker

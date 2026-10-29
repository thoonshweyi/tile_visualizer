import { useEffect, useRef, useState } from 'react'

import ActivityButton from './ActivityButton'
import Brand from './Brand'
import CompareSlider from './CompareSlider'
import { DEFAULT_GROUT_SETTING, DEFAULT_TEXTURE_ADJUSTMENT } from './flowData'
import { colorizeMask, distance, getOpenCv, loadImage, normalizeAreaName, orderPoints } from './flowUtils'
import Icon from './Icon'
import GroutSettingsModal from './GroutSettingsModal'
import PointsPanel from './PointsPanel'
import ProductsPanel from './ProductsPanel'



export default function Workspace({ room, onChangeRoom }) {
  const roomImageRef = useRef(null)
  const tileCanvasRef = useRef(null)
  const dragPointRef = useRef(null)
  const roomFileRef = useRef(null)
  const maskRequestRef = useRef(null)
  const maskObjectUrlsRef = useRef(new Set())
  const textureAdjustmentTimersRef = useRef({})
  const applyRequestRef = useRef(0)
  const applyVersionByAreaRef = useRef({})
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
  const [selectedProductsByArea, setSelectedProductsByArea] = useState({})
  const [appliedPreviewsByArea, setAppliedPreviewsByArea] = useState({})
  const [textureAdjustmentsByArea, setTextureAdjustmentsByArea] = useState({})
  const [groutSettingsByArea, setGroutSettingsByArea] = useState({})
  const [applyingProduct, setApplyingProduct] = useState(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [comparePosition, setComparePosition] = useState(50)
  const [groutModalOpen, setGroutModalOpen] = useState(false)

  useEffect(() => () => {
    maskRequestRef.current?.controller.abort()
    Object.values(textureAdjustmentTimersRef.current).forEach((timer) => window.clearTimeout(timer))
    maskObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const changeRoom = () => {
    if (room.workspaceObjectUrl) URL.revokeObjectURL(room.src)
    onChangeRoom()
  }

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

  const clearWorkingCanvas = () => {
    const canvas = tileCanvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setApplyError('')
  }

  const clearAreaProduct = (areaId) => {
    if (!areaId) return
    setCompareMode(false)
    setGroutModalOpen(false)
    window.clearTimeout(textureAdjustmentTimersRef.current[areaId])
    delete textureAdjustmentTimersRef.current[areaId]
    applyVersionByAreaRef.current[areaId] = (applyVersionByAreaRef.current[areaId] || 0) + 1
    setSelectedProductsByArea((current) => {
      const next = { ...current }
      delete next[areaId]
      return next
    })
    setAppliedPreviewsByArea((current) => {
      const next = { ...current }
      delete next[areaId]
      return next
    })
    setTextureAdjustmentsByArea((current) => {
      const next = { ...current }
      delete next[areaId]
      return next
    })
    setGroutSettingsByArea((current) => {
      const next = { ...current }
      delete next[areaId]
      return next
    })
  }

  const getPerspectivePoint = (clientX, clientY, allowOutside = false) => {
    const image = roomImageRef.current
    if (!image) return null
    const bounds = image.getBoundingClientRect()
    const isOutside = (
      clientX < bounds.left
      || clientX > bounds.right
      || clientY < bounds.top
      || clientY > bounds.bottom
    )
    if (isOutside && !allowOutside) return null

    const rawLeft = (clientX - bounds.left) / bounds.width
    const rawTop = (clientY - bounds.top) / bounds.height
    const left = allowOutside ? Math.max(-0.5, Math.min(1.5, rawLeft)) : rawLeft
    const top = allowOutside ? Math.max(-0.5, Math.min(1.5, rawTop)) : rawTop
    return {
      x: Math.round(left * image.naturalWidth),
      y: Math.round(top * image.naturalHeight),
      left: left * 100,
      top: top * 100,
    }
  }

  const selectArea = (area) => {
    clearWorkingCanvas()
    setPointMode(false)
    setPanel('points')
    setActiveAreaId(area.id)
    requestMaskForArea(area)
  }

  const startAddingPoints = (area) => {
    const areaId = area?.id || activeAreaId
    if (!areaId || maskStates[areaId]?.status !== 'success' || (pointsByArea[areaId] || []).length === 4) return
    clearWorkingCanvas()
    setActiveAreaId(areaId)
    setPanel('points')
    setPointMode(true)
  }

  const resetPoints = (area) => {
    const areaId = area?.id || activeAreaId
    if (!areaId) return
    clearWorkingCanvas()
    clearAreaProduct(areaId)
    setPointsByArea((current) => ({ ...current, [areaId]: [] }))
    if (activeAreaId === areaId) setPointMode(false)
  }

  const openProductsForArea = (area) => {
    if (maskStates[area.id]?.status !== 'success' || (pointsByArea[area.id] || []).length !== 4) return
    clearWorkingCanvas()
    setActiveAreaId(area.id)
    setPointMode(false)
    setPanel('products')
  }

  const deleteArea = (areaId) => {
    if (maskRequestRef.current?.areaId === areaId) {
      maskRequestRef.current.controller.abort()
      maskRequestRef.current = null
    }
    const maskState = maskStates[areaId]
    const urlsToRelease = [maskState?.url, maskState?.maskSource]
    urlsToRelease.forEach((url) => {
      if (url && maskObjectUrlsRef.current.has(url)) {
        URL.revokeObjectURL(url)
        maskObjectUrlsRef.current.delete(url)
      }
    })
    setAreas((current) => current.filter((area) => area.id !== areaId))
    setMaskStates((current) => {
      const next = { ...current }
      delete next[areaId]
      return next
    })
    setPointsByArea((current) => {
      const next = { ...current }
      delete next[areaId]
      return next
    })
    clearAreaProduct(areaId)
    if (activeAreaId === areaId) {
      clearWorkingCanvas()
      setActiveAreaId(null)
      setPointMode(false)
      setPanel('points')
    }
  }

  const startAddingArea = () => {
    if (areas.length >= 6) return
    clearWorkingCanvas()
    setPointMode(false)
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
      clearWorkingCanvas()
      clearAreaProduct(activeAreaId)
      return
    }

    if (!isAddingArea) {
      clearWorkingCanvas()
      setActiveAreaId(null)
      setPointMode(false)
      setPanel('points')
      return
    }
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
    clearWorkingCanvas()
    clearAreaProduct(activeAreaId)
    dragPointRef.current = { areaId: activeAreaId, index }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePerspectivePointMove = (event) => {
    const dragging = dragPointRef.current
    if (!dragging) return
    event.stopPropagation()
    const nextPoint = getPerspectivePoint(event.clientX, event.clientY, true)
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

  const applyProduct = async (product, targetAreaId = activeAreaId, adjustmentOverride, groutOverride) => {
    const areaId = targetAreaId
    const points = areaId ? pointsByArea[areaId] || [] : []
    const maskSource = areaId ? maskStates[areaId]?.maskSource : ''
    if (!areaId || points.length !== 4 || !maskSource) {
      setApplyError('Select an area and add four points before choosing a product.')
      return
    }

    const adjustment = adjustmentOverride || textureAdjustmentsByArea[areaId] || DEFAULT_TEXTURE_ADJUSTMENT
    const groutSetting = groutOverride || groutSettingsByArea[areaId] || DEFAULT_GROUT_SETTING
    const requestId = applyRequestRef.current + 1
    applyRequestRef.current = requestId
    const areaVersion = (applyVersionByAreaRef.current[areaId] || 0) + 1
    applyVersionByAreaRef.current[areaId] = areaVersion

    setApplyingProduct(product)
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
      const tileSize = 120 * adjustment.scale
      const tileRatio = tileImage.naturalWidth / tileImage.naturalHeight
      const cellWidth = tileSize
      const cellHeight = tileSize / tileRatio
      const grout = Math.max(0, groutSetting.gap * adjustment.scale)
      const rotation = (adjustment.rotation * Math.PI) / 180
      const offsetX = (adjustment.offsetX / 100) * cellWidth
      const offsetY = (adjustment.offsetY / 100) * cellHeight
      const patternPadding = Math.ceil(Math.hypot(textureWidth, textureHeight))
      const cellCanvas = document.createElement('canvas')
      cellCanvas.width = Math.max(1, Math.round(cellWidth))
      cellCanvas.height = Math.max(1, Math.round(cellHeight))
      const cellContext = cellCanvas.getContext('2d')

      cellContext.fillStyle = groutSetting.color
      cellContext.fillRect(0, 0, cellCanvas.width, cellCanvas.height)
      cellContext.drawImage(
        tileImage,
        grout,
        grout,
        Math.max(1, cellCanvas.width - grout * 2),
        Math.max(1, cellCanvas.height - grout * 2),
      )

      textureContext.fillStyle = groutSetting.color
      textureContext.fillRect(0, 0, textureWidth, textureHeight)
      textureContext.save()
      textureContext.translate((textureWidth / 2) + offsetX, (textureHeight / 2) + offsetY)
      textureContext.rotate(rotation)
      textureContext.translate(-(textureWidth / 2), -(textureHeight / 2))
      textureContext.fillStyle = textureContext.createPattern(cellCanvas, 'repeat')
      textureContext.fillRect(
        -patternPadding,
        -patternPadding,
        textureWidth + patternPadding * 2,
        textureHeight + patternPadding * 2,
      )
      textureContext.restore()

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
      const previewUrl = canvas.toDataURL('image/png')

      if (applyVersionByAreaRef.current[areaId] !== areaVersion) return

      setPointsByArea((current) => ({
        ...current,
        [areaId]: [topLeft, topRight, bottomRight, bottomLeft].map((point) => ({
          ...point,
          left: (point.x / width) * 100,
          top: (point.y / height) * 100,
        })),
      }))
      setSelectedProductsByArea((current) => ({ ...current, [areaId]: product }))
      setTextureAdjustmentsByArea((current) => ({ ...current, [areaId]: adjustment }))
      setGroutSettingsByArea((current) => ({ ...current, [areaId]: groutSetting }))
      setAppliedPreviewsByArea((current) => ({
        ...current,
        [areaId]: { productId: product.id, url: previewUrl },
      }))
      outputContext.clearRect(0, 0, canvas.width, canvas.height)
    } catch (error) {
      clearWorkingCanvas()
      setApplyError(error.message || 'Product perspective could not be applied.')
    } finally {
      tileMat?.delete()
      warpedMat?.delete()
      sourcePoints?.delete()
      destinationPoints?.delete()
      transform?.delete()
      if (applyRequestRef.current === requestId) {
        setIsApplying(false)
        setApplyingProduct(null)
      }
    }
  }

  const updateTextureAdjustment = (area, key, value) => {
    const currentAdjustment = textureAdjustmentsByArea[area.id] || DEFAULT_TEXTURE_ADJUSTMENT
    const nextAdjustment = { ...currentAdjustment, [key]: value }
    setTextureAdjustmentsByArea((current) => ({ ...current, [area.id]: nextAdjustment }))

    const product = selectedProductsByArea[area.id]
    if (!product) return
    window.clearTimeout(textureAdjustmentTimersRef.current[area.id])
    textureAdjustmentTimersRef.current[area.id] = window.setTimeout(() => {
      applyProduct(product, area.id, nextAdjustment)
    }, 120)
  }

  const resetTextureAdjustment = (area) => {
    window.clearTimeout(textureAdjustmentTimersRef.current[area.id])
    delete textureAdjustmentTimersRef.current[area.id]
    const nextAdjustment = { ...DEFAULT_TEXTURE_ADJUSTMENT }
    setTextureAdjustmentsByArea((current) => ({ ...current, [area.id]: nextAdjustment }))
    const product = selectedProductsByArea[area.id]
    if (product) applyProduct(product, area.id, nextAdjustment)
  }

  const updateGroutSetting = (key, value) => {
    if (!activeAreaId) return
    const currentSetting = groutSettingsByArea[activeAreaId] || DEFAULT_GROUT_SETTING
    const nextSetting = { ...currentSetting, [key]: value }
    setGroutSettingsByArea((current) => ({ ...current, [activeAreaId]: nextSetting }))

    const product = selectedProductsByArea[activeAreaId]
    if (!product) return
    window.clearTimeout(textureAdjustmentTimersRef.current[activeAreaId])
    textureAdjustmentTimersRef.current[activeAreaId] = window.setTimeout(() => {
      applyProduct(
        product,
        activeAreaId,
        textureAdjustmentsByArea[activeAreaId] || DEFAULT_TEXTURE_ADJUSTMENT,
        nextSetting,
      )
    }, 120)
  }

  const resetGroutSetting = () => {
    if (!activeAreaId) return
    window.clearTimeout(textureAdjustmentTimersRef.current[activeAreaId])
    const nextSetting = { ...DEFAULT_GROUT_SETTING }
    setGroutSettingsByArea((current) => ({ ...current, [activeAreaId]: nextSetting }))
    const product = selectedProductsByArea[activeAreaId]
    if (product) {
      applyProduct(
        product,
        activeAreaId,
        textureAdjustmentsByArea[activeAreaId] || DEFAULT_TEXTURE_ADJUSTMENT,
        nextSetting,
      )
    }
  }

  const downloadRoom = async () => {
    if (isDownloading || isApplying) return
    setIsDownloading(true)
    setDownloadError('')

    try {
      const roomImage = roomImageRef.current
      if (!roomImage?.naturalWidth || !roomImage?.naturalHeight) {
        throw new Error('Room image is not ready to download.')
      }

      const downloadCanvas = document.createElement('canvas')
      downloadCanvas.width = roomImage.naturalWidth
      downloadCanvas.height = roomImage.naturalHeight
      const downloadContext = downloadCanvas.getContext('2d')
      downloadContext.drawImage(roomImage, 0, 0, downloadCanvas.width, downloadCanvas.height)

      const previewSources = areas
        .map((area) => appliedPreviewsByArea[area.id]?.url)
        .filter(Boolean)
      const previewImages = await Promise.all(previewSources.map((source) => loadImage(source)))
      previewImages.forEach((previewImage) => {
        downloadContext.drawImage(previewImage, 0, 0, downloadCanvas.width, downloadCanvas.height)
      })

      const downloadBlob = await new Promise((resolve, reject) => {
        downloadCanvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('The download image could not be created.'))
        }, 'image/png')
      })
      const downloadUrl = URL.createObjectURL(downloadBlob)
      const downloadLink = document.createElement('a')
      const safeRoomName = room.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'room'
      downloadLink.href = downloadUrl
      downloadLink.download = `${safeRoomName}-tile-preview.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (error) {
      setDownloadError(error.message || 'The room preview could not be downloaded.')
    } finally {
      setIsDownloading(false)
    }
  }

  const hasAppliedPreviews = areas.some((area) => Boolean(appliedPreviewsByArea[area.id]))
  const canCompare = hasAppliedPreviews && !isApplying && !isAddingArea && !pointMode

  const toggleCompare = () => {
    if (compareMode) {
      setCompareMode(false)
      return
    }
    if (!canCompare) return
    setComparePosition(50)
    setCompareMode(true)
  }

  const activeArea = areas.find((area) => area.id === activeAreaId) ?? null
  const activeMaskState = activeArea ? maskStates[activeArea.id] : null
  const activePoints = activeAreaId ? pointsByArea[activeAreaId] || [] : []
  const selectedProduct = activeAreaId ? selectedProductsByArea[activeAreaId] || null : null
  const canUseProducts = Boolean(activeArea && activeMaskState?.status === 'success' && activePoints.length === 4)
  const canOpenGrout = Boolean(activeArea && selectedProduct && activePoints.length === 4 && !isApplying)
  const activeGroutSetting = activeAreaId ? groutSettingsByArea[activeAreaId] || DEFAULT_GROUT_SETTING : DEFAULT_GROUT_SETTING

  const openGroutSettings = () => {
    if (!canOpenGrout) return
    setCompareMode(false)
    setGroutModalOpen(true)
  }
  const roomAspectRatio = roomImageSize.width / roomImageSize.height
  const roomFrameStyle = {
    aspectRatio: `${roomImageSize.width} / ${roomImageSize.height}`,
    width: `min(100%, calc((100dvh - 190px) * ${roomAspectRatio}))`,
  }


  return (
    <div className="grid h-screen grid-rows-[72px_minmax(0,1fr)] overflow-hidden border-t-[5px] border-[#333] bg-[#f1f3f4] font-sans text-[#242424]">
      <header className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#ddd] bg-white px-5 max-md:px-3"><Brand /><nav className="flex items-center justify-center gap-1 max-md:hidden"><button className="rounded-lg px-3 py-2 text-[11px] text-[#555]">53%</button><button type="button" onClick={toggleCompare} disabled={!compareMode && !canCompare} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-35 ${compareMode ? 'bg-[#242424] text-white' : 'text-[#444] hover:bg-[#f4f4f4]'}`}><Icon name="compare" size={17} /> {compareMode ? 'Close compare' : 'Compare'}</button><button type="button" onClick={downloadRoom} disabled={isDownloading || isApplying} className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#444] hover:bg-[#f4f4f4] disabled:cursor-wait disabled:opacity-45"><Icon name="download" size={17} /> {isDownloading ? 'Preparing…' : 'Download'}</button><button className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#444] hover:bg-[#f4f4f4]"><Icon name="share" size={17} /> Share</button><button onClick={changeRoom} className="ml-2 flex items-center gap-2 rounded-full border border-[#ef4444] px-4 py-2 text-[11px] font-semibold text-[#ef4444]"><Icon name="plus" size={16} /> New room</button></nav><button className="justify-self-end rounded-full bg-[#f1f1f1] px-4 py-2 text-[10px] text-[#666]">Exit</button></header>

      <main className="grid min-h-0 grid-cols-[58px_310px_minmax(0,1fr)] max-lg:grid-cols-[58px_260px_minmax(0,1fr)] max-md:grid-cols-[52px_minmax(0,1fr)]">
        <aside className="z-20 flex min-h-0 flex-col items-center bg-[#242424]"><ActivityButton active={panel === 'points'} icon="points" label="Surface points" onClick={() => setPanel('points')} /><ActivityButton active={panel === 'products'} icon="products" label={canUseProducts ? 'Products' : 'Add 4 points first'} disabled={!canUseProducts} onClick={() => { setPointMode(false); setPanel('products') }} /><div className="mt-auto w-full border-t border-white/10"><ActivityButton icon="adjust" label="Settings" /></div></aside>
        <div className="min-h-0 max-md:absolute max-md:bottom-0 max-md:left-[52px] max-md:top-[72px] max-md:z-10 max-md:w-[280px] max-md:shadow-xl">{panel === 'points' ? <PointsPanel areas={areas} activeAreaId={activeAreaId} pointsByArea={pointsByArea} selectedProductsByArea={selectedProductsByArea} textureAdjustmentsByArea={textureAdjustmentsByArea} onSelectArea={selectArea} onDeleteArea={deleteArea} onOpenProducts={openProductsForArea} maskStates={maskStates} pointMode={pointMode} onStartPoints={startAddingPoints} onResetPoints={resetPoints} onTextureAdjustmentChange={updateTextureAdjustment} onResetTextureAdjustment={resetTextureAdjustment} isAddingArea={isAddingArea} pendingArea={pendingArea} draftName={draftName} setDraftName={setDraftName} draftType={draftType} setDraftType={setDraftType} onStartAdd={startAddingArea} onCancelAdd={cancelAddingArea} onSaveArea={saveArea} /> : <ProductsPanel selectedProduct={selectedProduct} applyingProduct={applyingProduct} onSelectProduct={applyProduct} isApplying={isApplying} activeArea={activeArea} applyError={applyError} />}</div>
        <section className="relative grid min-h-0 min-w-0 grid-rows-[40px_minmax(0,1fr)_58px] bg-[#f3f4f5] bg-[radial-gradient(#d0d0d0_0.7px,transparent_0.7px)] bg-[length:7px_7px]">
          {downloadError && <div className="absolute right-5 top-12 z-50 max-w-xs rounded-lg bg-[#242424] px-4 py-2 text-[9px] font-semibold text-white shadow-lg" role="alert">{downloadError}</div>}
          <div className="flex items-center justify-between px-5 text-[9px] text-[#888]"><span>Workspace / <strong className="text-[#333]">{room.name}</strong></span><span className="rounded-full bg-white px-3 py-1 shadow-sm">{panel === 'points' ? 'Surface areas' : 'Products'}</span></div>
          <div className="flex min-h-0 items-center justify-center px-5 pb-5">
            <div
              onClick={handleRoomClick}
              style={roomFrameStyle}
              className={`relative max-h-full max-w-[1180px] overflow-visible rounded-sm bg-[#ddd] shadow-[0_18px_50px_rgba(0,0,0,0.16)] ${(isAddingArea || pointMode) ? 'cursor-crosshair ring-2 ring-[#ef4444] ring-offset-2' : ''}`}
            >
              <img
                ref={roomImageRef}
                src={room.src}
                alt={room.name}
                onLoad={(event) => setRoomImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
                className="absolute inset-0 block h-full w-full select-none rounded-sm object-contain"
                draggable="false"
              />

              {!compareMode && activeMaskState?.status === 'success' && !appliedPreviewsByArea[activeAreaId] && (
                <img src={activeMaskState.url} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain" />
              )}

              {areas.map((area) => appliedPreviewsByArea[area.id] && (
                <img key={area.id} src={appliedPreviewsByArea[area.id].url} alt="" aria-hidden="true" style={compareMode ? { clipPath: `inset(0 0 0 ${comparePosition}%)` } : undefined} className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-contain" />
              ))}

              <canvas ref={tileCanvasRef} className={`pointer-events-none absolute inset-0 z-[3] h-full w-full ${compareMode ? 'hidden' : ''}`} aria-hidden="true" />

              {compareMode && <CompareSlider value={comparePosition} onChange={setComparePosition} />}

              {!compareMode && activePoints.length > 1 && (
                <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" viewBox={`0 0 ${roomImageSize.width} ${roomImageSize.height}`} preserveAspectRatio="none" aria-hidden="true">
                  {activePoints.length === 4
                    ? <polygon points={activePoints.map(({ x, y }) => `${x},${y}`).join(' ')} fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="5" strokeDasharray="14 10" />
                    : <polyline points={activePoints.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="5" strokeDasharray="14 10" />}
                </svg>
              )}

              {!compareMode && activePoints.map((point, index) => (
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

              {!compareMode && activeMaskState?.status === 'loading' && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-[#242424]/85 px-4 py-2 text-[9px] font-semibold text-white shadow-lg backdrop-blur-sm"><span className="size-3 animate-spin rounded-full border-2 border-white/35 border-t-white" /> Generating {activeArea?.name} mask…</div>
              )}

              {!compareMode && isApplying && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-[#242424]/85 px-4 py-2 text-[9px] font-semibold text-white shadow-lg backdrop-blur-sm"><span className="size-3 animate-spin rounded-full border-2 border-white/35 border-t-white" /> Applying {applyingProduct?.name}…</div>
              )}

              {!compareMode && activeMaskState?.status === 'error' && (
                <div className="absolute bottom-4 left-1/2 z-20 max-w-[80%] -translate-x-1/2 rounded-lg bg-[#242424]/90 px-4 py-2 text-center text-[9px] font-semibold text-white shadow-lg" role="alert">{activeMaskState.error}</div>
              )}

              {!compareMode && isAddingArea && !pendingArea && <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-[#222]/85 px-4 py-2 text-[9px] font-semibold text-white shadow-lg">Click the image to place Area {String(areas.length + 1).padStart(2, '0')}</div>}

              {!compareMode && pointMode && <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-[#222]/85 px-4 py-2 text-[9px] font-semibold text-white shadow-lg">Add perspective points · {activePoints.length}/4</div>}

              {!compareMode && areas.map((area) => {
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

              {!compareMode && pendingArea && (
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
              <button type="button" onClick={openGroutSettings} disabled={!canOpenGrout} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[#333] hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-35"><Icon name="grout" size={17} /> Grout</button>
              <button className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[#333] hover:bg-[#f5f5f5]"><Icon name="layout" size={17} /> Layout</button>
              <button className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[#333] hover:bg-[#f5f5f5]"><Icon name="applied" size={17} /> Applied products</button>
              <button type="button" onClick={toggleCompare} disabled={!compareMode && !canCompare} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 disabled:cursor-not-allowed disabled:opacity-35 ${compareMode ? 'bg-[#242424] text-white' : 'text-[#333] hover:bg-[#f5f5f5]'}`}><Icon name="compare" size={17} /> {compareMode ? 'Close compare' : 'Compare'}</button>
            </div>
          </div>
        </section>
      </main>
      {groutModalOpen && activeArea && (
        <GroutSettingsModal
          areaName={activeArea.name}
          setting={activeGroutSetting}
          onChange={updateGroutSetting}
          onReset={resetGroutSetting}
          onClose={() => setGroutModalOpen(false)}
        />
      )}
    </div>
  )
}


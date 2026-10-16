import cvModule from '@techstark/opencv-js'

export const normalizeAreaName = (name) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

let openCvPromise

export function getOpenCv() {
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

export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be opened.'))
    image.src = source
  })
}

export function orderPoints(points) {
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

export const distance = (first, second) => Math.hypot(second.x - first.x, second.y - first.y)

export function colorizeMask(source) {
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

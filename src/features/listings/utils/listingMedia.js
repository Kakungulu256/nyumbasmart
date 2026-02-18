const DEFAULT_OPTIONS = {
  maxDimension: 1920,
  qualityStart: 0.86,
  qualityMin: 0.55,
  qualityStep: 0.08,
  targetBytes: 1_200_000,
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to read image file.'))
    }

    image.src = objectUrl
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image compression failed.'))
          return
        }

        resolve(blob)
      },
      type,
      quality,
    )
  })
}

function getScaledDimensions(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }

  const scale = Math.min(maxDimension / width, maxDimension / height)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function createCompressedFileName(originalName) {
  const baseName = (originalName || 'image').replace(/\.[^/.]+$/, '')
  return `${baseName}.jpg`
}

export function isSupportedImage(file) {
  return Boolean(file?.type?.startsWith('image/'))
}

export async function compressImageFile(file, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  if (!isSupportedImage(file)) {
    return file
  }

  const image = await loadImage(file)
  const { width, height } = getScaledDimensions(image.width, image.height, config.maxDimension)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to prepare image compression.')
  }

  context.drawImage(image, 0, 0, width, height)

  let quality = config.qualityStart
  let bestBlob = await canvasToBlob(canvas, 'image/jpeg', quality)

  while (bestBlob.size > config.targetBytes && quality > config.qualityMin) {
    quality = Math.max(config.qualityMin, quality - config.qualityStep)
    bestBlob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }

  if (bestBlob.size >= file.size) {
    return file
  }

  return new File([bestBlob], createCompressedFileName(file.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

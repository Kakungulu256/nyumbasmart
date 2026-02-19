const DEFAULT_OPTIONS = {
  maxDimension: 1920,
  qualityStart: 0.86,
  qualityMin: 0.55,
  qualityStep: 0.08,
  targetBytes: 1_200_000,
}

export const LISTING_IMAGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const LISTING_IMAGE_MAX_INPUT_BYTES = 15 * 1024 * 1024
export const LISTING_IMAGE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const LISTING_IMAGE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

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
  if (!file || typeof file !== 'object') {
    return false
  }

  const fileType = String(file.type || '').toLowerCase()
  const fileExtension = String(file.name || '')
    .split('.')
    .pop()
    ?.toLowerCase()

  return LISTING_IMAGE_ALLOWED_MIME_TYPES.includes(fileType) && LISTING_IMAGE_ALLOWED_EXTENSIONS.includes(fileExtension)
}

export function validateImageFile(file) {
  if (!isSupportedImage(file)) {
    return 'Only JPG, PNG, and WEBP image files are allowed.'
  }

  const fileSize = Number(file.size || 0)
  if (fileSize <= 0) {
    return 'Selected image is empty.'
  }

  if (fileSize > LISTING_IMAGE_MAX_INPUT_BYTES) {
    return 'Image is too large. Maximum raw file size is 15MB.'
  }

  return ''
}

export async function compressImageFile(file, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  if (!isSupportedImage(file)) {
    throw new Error('Unsupported image format.')
  }

  if (Number(file.size || 0) > LISTING_IMAGE_MAX_INPUT_BYTES) {
    throw new Error('Image is too large. Maximum raw file size is 15MB.')
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
    if (file.size > LISTING_IMAGE_MAX_UPLOAD_BYTES) {
      throw new Error('Image is too large. Keep each upload below 5MB.')
    }

    return file
  }

  const compressedFile = new File([bestBlob], createCompressedFileName(file.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })

  if (compressedFile.size > LISTING_IMAGE_MAX_UPLOAD_BYTES) {
    throw new Error('Compressed image is still too large. Please choose a smaller image.')
  }

  return compressedFile
}

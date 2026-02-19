import { ID, Storage } from 'appwrite'

import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'
import { normalizeAppwriteError } from '@/services/appwrite/errors'
import { hasAllowedFileExtension } from '@/utils/security'

export const storage = new Storage(appwriteClient)

function requireBucketId(bucketId) {
  ensureAppwriteConfigured()

  if (!bucketId) {
    throw new Error('Missing Appwrite bucket ID.')
  }

  return bucketId
}

export const storageService = {
  listFiles: async ({ bucketId, queries = [] }) => {
    try {
      return await storage.listFiles(requireBucketId(bucketId), queries)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to list files.')
    }
  },

  uploadFile: async ({ bucketId, file, fileId = ID.unique(), permissions, onProgress, maxBytes, allowedMimeTypes = [], allowedExtensions = [] }) => {
    if (!file || typeof file !== 'object') {
      throw new Error('A valid file is required for upload.')
    }

    if (typeof maxBytes === 'number' && Number.isFinite(maxBytes) && maxBytes > 0 && Number(file.size || 0) > maxBytes) {
      throw new Error(`File size exceeds the limit of ${Math.round(maxBytes / (1024 * 1024))}MB.`)
    }

    if (allowedMimeTypes.length > 0 && file.type && !allowedMimeTypes.includes(file.type.toLowerCase())) {
      throw new Error('File type is not allowed.')
    }

    if (!hasAllowedFileExtension(file.name, allowedExtensions.map((item) => String(item).toLowerCase()))) {
      throw new Error('File extension is not allowed.')
    }

    try {
      return await storage.createFile(requireBucketId(bucketId), fileId, file, permissions, onProgress)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to upload file.')
    }
  },

  getFile: async ({ bucketId, fileId }) => {
    try {
      return await storage.getFile(requireBucketId(bucketId), fileId)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to load file details.')
    }
  },

  getFileView: ({ bucketId, fileId }) => {
    try {
      return storage.getFileView(requireBucketId(bucketId), fileId)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to load file preview.')
    }
  },

  getFilePreview: ({ bucketId, fileId, ...options }) => {
    try {
      return storage.getFilePreview({ bucketId: requireBucketId(bucketId), fileId, ...options })
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to load file preview.')
    }
  },

  deleteFile: async ({ bucketId, fileId }) => {
    try {
      return await storage.deleteFile(requireBucketId(bucketId), fileId)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to delete file.')
    }
  },
}

export { ID }

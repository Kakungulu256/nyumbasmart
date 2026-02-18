import { ID, Storage } from 'appwrite'

import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'

export const storage = new Storage(appwriteClient)

function requireBucketId(bucketId) {
  ensureAppwriteConfigured()

  if (!bucketId) {
    throw new Error('Missing Appwrite bucket ID.')
  }

  return bucketId
}

export const storageService = {
  listFiles: async ({ bucketId, queries = [] }) =>
    storage.listFiles(requireBucketId(bucketId), queries),

  uploadFile: async ({ bucketId, file, fileId = ID.unique(), permissions, onProgress }) =>
    storage.createFile(requireBucketId(bucketId), fileId, file, permissions, onProgress),

  getFile: async ({ bucketId, fileId }) => storage.getFile(requireBucketId(bucketId), fileId),

  getFileView: ({ bucketId, fileId }) => storage.getFileView(requireBucketId(bucketId), fileId),

  getFilePreview: ({ bucketId, fileId, ...options }) =>
    storage.getFilePreview({ bucketId: requireBucketId(bucketId), fileId, ...options }),

  deleteFile: async ({ bucketId, fileId }) => storage.deleteFile(requireBucketId(bucketId), fileId),
}

export { ID }

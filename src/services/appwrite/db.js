import { Databases, ID, Query } from 'appwrite'

import { databaseId } from '@/constants/database'
import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'
import { normalizeAppwriteError } from '@/services/appwrite/errors'

export const databases = new Databases(appwriteClient)

function requireDatabaseId() {
  ensureAppwriteConfigured()

  if (!databaseId) {
    throw new Error('Missing Appwrite database ID. Set VITE_APPWRITE_DATABASE_ID.')
  }

  return databaseId
}

export const dbService = {
  listDocuments: async ({ collectionId, queries = [] }) => {
    try {
      return await databases.listDocuments(requireDatabaseId(), collectionId, queries)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to load data.')
    }
  },

  getDocument: async ({ collectionId, documentId, queries = [] }) => {
    try {
      return await databases.getDocument(requireDatabaseId(), collectionId, documentId, queries)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to load record.')
    }
  },

  createDocument: async ({ collectionId, data, documentId = ID.unique(), permissions }) => {
    try {
      return await databases.createDocument(requireDatabaseId(), collectionId, documentId, data, permissions)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to save record.')
    }
  },

  updateDocument: async ({ collectionId, documentId, data, permissions }) => {
    try {
      return await databases.updateDocument(requireDatabaseId(), collectionId, documentId, data, permissions)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to update record.')
    }
  },

  deleteDocument: async ({ collectionId, documentId }) => {
    try {
      return await databases.deleteDocument(requireDatabaseId(), collectionId, documentId)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to delete record.')
    }
  },
}

export { ID, Query }

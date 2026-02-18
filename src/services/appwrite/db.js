import { Databases, ID, Query } from 'appwrite'

import { databaseId } from '@/constants/database'
import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'

export const databases = new Databases(appwriteClient)

function requireDatabaseId() {
  ensureAppwriteConfigured()

  if (!databaseId) {
    throw new Error('Missing Appwrite database ID. Set VITE_APPWRITE_DATABASE_ID.')
  }

  return databaseId
}

export const dbService = {
  listDocuments: async ({ collectionId, queries = [] }) =>
    databases.listDocuments(requireDatabaseId(), collectionId, queries),

  getDocument: async ({ collectionId, documentId, queries = [] }) =>
    databases.getDocument(requireDatabaseId(), collectionId, documentId, queries),

  createDocument: async ({ collectionId, data, documentId = ID.unique(), permissions }) =>
    databases.createDocument(requireDatabaseId(), collectionId, documentId, data, permissions),

  updateDocument: async ({ collectionId, documentId, data, permissions }) =>
    databases.updateDocument(requireDatabaseId(), collectionId, documentId, data, permissions),

  deleteDocument: async ({ collectionId, documentId }) =>
    databases.deleteDocument(requireDatabaseId(), collectionId, documentId),
}

export { ID, Query }

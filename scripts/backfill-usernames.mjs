import { Client, Databases, Query } from 'node-appwrite'

import { readConfig, readSchemaIds } from './appwrite/env.mjs'

function createClient(config) {
  return new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey)
}

function normalizeUsername(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_.]+/g, '.')
    .replace(/[.]{2,}/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 30)
}

function baseUsername(profile) {
  const existing = normalizeUsername(profile?.username)
  if (existing) {
    return existing
  }

  const fromNames = normalizeUsername(`${profile?.firstName || ''}.${profile?.lastName || ''}`)
  if (fromNames) {
    return fromNames
  }

  const fromUserId = normalizeUsername(profile?.userId).slice(0, 12)
  if (fromUserId) {
    return `user.${fromUserId}`.slice(0, 30)
  }

  return 'user'
}

function makeUniqueUsername(base, usedUsernames) {
  if (!usedUsernames.has(base)) {
    return base
  }

  let suffix = 2
  while (suffix < 10000) {
    const suffixLabel = `.${suffix}`
    const candidate = `${base.slice(0, Math.max(1, 30 - suffixLabel.length))}${suffixLabel}`
    if (!usedUsernames.has(candidate)) {
      return candidate
    }
    suffix += 1
  }

  throw new Error(`Unable to generate unique username for base "${base}"`)
}

async function listAllUserProfiles({ databases, databaseId, collectionId }) {
  const allDocuments = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments({
      databaseId,
      collectionId,
      queries: [Query.limit(limit), Query.offset(offset)],
    })

    allDocuments.push(...response.documents)

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allDocuments
}

async function main() {
  const config = readConfig()
  const schemaIds = readSchemaIds()

  const client = createClient(config)
  const databases = new Databases(client)
  const usersCollectionId = schemaIds.collections.users

  console.log('[usernames] scanning users collection...')

  const profiles = await listAllUserProfiles({
    databases,
    databaseId: config.databaseId,
    collectionId: usersCollectionId,
  })

  const usedUsernames = new Set()
  const updates = []

  const sortedProfiles = [...profiles].sort((a, b) => {
    const timeA = new Date(a.$createdAt || 0).getTime()
    const timeB = new Date(b.$createdAt || 0).getTime()
    return timeA - timeB
  })

  for (const profile of sortedProfiles) {
    const normalizedCurrent = normalizeUsername(profile.username)
    const nextBase = baseUsername(profile)
    const nextUsername = makeUniqueUsername(nextBase, usedUsernames)
    usedUsernames.add(nextUsername)

    if (normalizedCurrent !== nextUsername) {
      updates.push({
        documentId: profile.$id,
        username: nextUsername,
      })
    }
  }

  if (updates.length === 0) {
    console.log(`[usernames] done. updated=0, total=${profiles.length}`)
    return
  }

  for (const update of updates) {
    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: usersCollectionId,
      documentId: update.documentId,
      data: {
        username: update.username,
      },
    })

    console.log(`[usernames] updated ${update.documentId} -> @${update.username}`)
  }

  console.log(`[usernames] done. updated=${updates.length}, total=${profiles.length}`)
}

main().catch((error) => {
  console.error('[usernames] failed', error)
  process.exit(1)
})

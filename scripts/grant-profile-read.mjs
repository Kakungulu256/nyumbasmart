import { Client, Databases, Permission, Query, Role } from 'node-appwrite'

import { readConfig, readSchemaIds } from './appwrite/env.mjs'

function createClient(config) {
  return new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey)
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
  const globalRead = Permission.read(Role.users())

  console.log('[profiles] scanning users collection...')
  const profiles = await listAllUserProfiles({
    databases,
    databaseId: config.databaseId,
    collectionId: usersCollectionId,
  })

  let updated = 0

  for (const profile of profiles) {
    const existingPermissions = Array.isArray(profile.$permissions) ? profile.$permissions : []
    if (existingPermissions.includes(globalRead)) {
      continue
    }

    const nextPermissions = [...new Set([...existingPermissions, globalRead])]

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: usersCollectionId,
      documentId: profile.$id,
      data: {},
      permissions: nextPermissions,
    })

    updated += 1
    console.log(`[profiles] updated ${profile.$id}`)
  }

  console.log(`[profiles] done. updated=${updated}, total=${profiles.length}`)
}

main().catch((error) => {
  console.error('[profiles] failed', error)
  process.exit(1)
})

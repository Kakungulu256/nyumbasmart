import { Client, Databases, Query, Storage } from 'node-appwrite'

import { readConfig, readSchemaIds } from './appwrite/env.mjs'
import { buildBuckets, buildSchema } from './appwrite/schema.definitions.mjs'

const WAIT_INTERVAL_MS = 1500
const WAIT_TIMEOUT_MS = 180000

function suppressSdkVersionWarningNoise() {
  const originalWarn = console.warn
  let shown = false

  console.warn = (...args) => {
    const message = args.map((arg) => String(arg)).join(' ')
    const isSdkWarning = message.includes('current SDK is built for Appwrite')

    if (!isSdkWarning) {
      originalWarn(...args)
      return
    }

    if (!shown) {
      shown = true
      originalWarn(
        '[schema] SDK/server version mismatch warning suppressed for repeated requests ' +
          '(SDK expects 1.8.0, server is 1.7.4).',
      )
    }
  }
}

function isCode(error, code) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createClient(config) {
  return new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey)
}

async function ensureBucket({ storage, bucketDef, dryRun }) {
  const { id: bucketId, name } = bucketDef
  let exists = true

  try {
    await storage.getBucket({ bucketId })
    console.log(`[schema] bucket exists: ${bucketId}`)
  } catch (error) {
    if (!isCode(error, 404)) {
      throw error
    }

    exists = false

    if (dryRun) {
      console.log(`[schema] DRY RUN create bucket: ${bucketId}`)
      return false
    }

    console.log(`[schema] create bucket: ${bucketId}`)
    await storage.createBucket({
      bucketId,
      name,
      permissions: bucketDef.permissions,
      fileSecurity: bucketDef.fileSecurity,
      enabled: bucketDef.enabled,
      maximumFileSize: bucketDef.maximumFileSize,
      allowedFileExtensions: bucketDef.allowedFileExtensions,
      compression: bucketDef.compression,
      encryption: bucketDef.encryption,
      antivirus: bucketDef.antivirus,
      transformations: bucketDef.transformations,
    })
  }

  if (dryRun) {
    console.log(`[schema] DRY RUN update bucket: ${bucketId}`)
    return exists
  }

  await storage.updateBucket({
    bucketId,
    name,
    permissions: bucketDef.permissions,
    fileSecurity: bucketDef.fileSecurity,
    enabled: bucketDef.enabled,
    maximumFileSize: bucketDef.maximumFileSize,
    allowedFileExtensions: bucketDef.allowedFileExtensions,
    compression: bucketDef.compression,
    encryption: bucketDef.encryption,
    antivirus: bucketDef.antivirus,
    transformations: bucketDef.transformations,
  })

  console.log(`[schema] bucket configured: ${bucketId}`)
  return true
}

async function ensureCollection({ databases, databaseId, collectionDef, dryRun }) {
  const { id: collectionId, name, permissions, documentSecurity } = collectionDef
  let exists = true

  try {
    await databases.getCollection({ databaseId, collectionId })
    console.log(`[schema] collection exists: ${collectionId}`)
  } catch (error) {
    if (!isCode(error, 404)) {
      throw error
    }

    if (dryRun) {
      console.log(`[schema] DRY RUN create collection: ${collectionId}`)
      exists = false
    } else {
      console.log(`[schema] create collection: ${collectionId}`)
      await databases.createCollection({
        databaseId,
        collectionId,
        name,
        permissions,
        documentSecurity,
        enabled: true,
      })
    }
  }

  if (dryRun) {
    console.log(`[schema] DRY RUN update collection permissions: ${collectionId}`)
    return exists
  }

  await databases.updateCollection({
    databaseId,
    collectionId,
    name,
    permissions,
    documentSecurity,
    enabled: true,
  })
  console.log(`[schema] collection configured: ${collectionId}`)
  return true
}

async function waitForAttributeAvailable({ databases, databaseId, collectionId, key }) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    const attribute = await databases.getAttribute({ databaseId, collectionId, key })

    if (attribute.status === 'available') {
      return
    }

    if (attribute.status === 'failed') {
      throw new Error(`Attribute ${collectionId}.${key} failed: ${attribute.error ?? 'unknown error'}`)
    }

    await sleep(WAIT_INTERVAL_MS)
  }

  throw new Error(`Timed out waiting for attribute ${collectionId}.${key} to become available.`)
}

async function waitForIndexAvailable({ databases, databaseId, collectionId, key }) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    const index = await databases.getIndex({ databaseId, collectionId, key })

    if (index.status === 'available') {
      return
    }

    if (index.status === 'failed') {
      throw new Error(`Index ${collectionId}.${key} failed: ${index.error ?? 'unknown error'}`)
    }

    await sleep(WAIT_INTERVAL_MS)
  }

  throw new Error(`Timed out waiting for index ${collectionId}.${key} to become available.`)
}

async function createAttribute({ databases, databaseId, collectionId, attribute }) {
  switch (attribute.type) {
    case 'string':
      return databases.createStringAttribute({
        databaseId,
        collectionId,
        key: attribute.key,
        size: attribute.size,
        required: attribute.required,
        xdefault: attribute.xdefault,
        array: attribute.array,
        encrypt: attribute.encrypt,
      })
    case 'integer':
      return databases.createIntegerAttribute({
        databaseId,
        collectionId,
        key: attribute.key,
        required: attribute.required,
        min: attribute.min,
        max: attribute.max,
        xdefault: attribute.xdefault,
        array: attribute.array,
      })
    case 'float':
      return databases.createFloatAttribute({
        databaseId,
        collectionId,
        key: attribute.key,
        required: attribute.required,
        min: attribute.min,
        max: attribute.max,
        xdefault: attribute.xdefault,
        array: attribute.array,
      })
    case 'boolean':
      return databases.createBooleanAttribute({
        databaseId,
        collectionId,
        key: attribute.key,
        required: attribute.required,
        xdefault: attribute.xdefault,
        array: attribute.array,
      })
    case 'datetime':
      return databases.createDatetimeAttribute({
        databaseId,
        collectionId,
        key: attribute.key,
        required: attribute.required,
        xdefault: attribute.xdefault,
        array: attribute.array,
      })
    case 'enum':
      return databases.createEnumAttribute({
        databaseId,
        collectionId,
        key: attribute.key,
        elements: attribute.elements,
        required: attribute.required,
        xdefault: attribute.xdefault,
        array: attribute.array,
      })
    case 'relationship':
      return databases.createRelationshipAttribute({
        databaseId,
        collectionId,
        relatedCollectionId: attribute.relatedCollectionId,
        type: attribute.relationType,
        twoWay: attribute.twoWay ?? false,
        key: attribute.key,
        twoWayKey: attribute.twoWayKey,
        onDelete: attribute.onDelete ?? 'restrict',
      })
    default:
      throw new Error(`Unsupported attribute type '${attribute.type}' for ${collectionId}.${attribute.key}`)
  }
}

async function ensureAttributes({ databases, databaseId, collectionDef, dryRun }) {
  const collectionId = collectionDef.id
  const attributeDefinitions = [...collectionDef.attributes, ...(collectionDef.relationships ?? [])]

  const { attributes } = await databases.listAttributes({
    databaseId,
    collectionId,
    queries: [Query.limit(200)],
  })

  const existingKeys = new Set(attributes.map((attribute) => attribute.key))

  for (const attribute of attributeDefinitions) {
    if (existingKeys.has(attribute.key)) {
      continue
    }

    if (dryRun) {
      console.log(`[schema] DRY RUN create attribute: ${collectionId}.${attribute.key}`)
      continue
    }

    console.log(`[schema] create attribute: ${collectionId}.${attribute.key}`)

    try {
      await createAttribute({ databases, databaseId, collectionId, attribute })
    } catch (error) {
      if (!isCode(error, 409)) {
        throw error
      }
    }

    await waitForAttributeAvailable({
      databases,
      databaseId,
      collectionId,
      key: attribute.key,
    })
  }
}

async function ensureIndexes({ databases, databaseId, collectionDef, dryRun }) {
  const collectionId = collectionDef.id

  const { indexes } = await databases.listIndexes({
    databaseId,
    collectionId,
    queries: [Query.limit(200)],
  })

  const existingKeys = new Set(indexes.map((index) => index.key))

  for (const index of collectionDef.indexes) {
    if (existingKeys.has(index.key)) {
      continue
    }

    if (dryRun) {
      console.log(`[schema] DRY RUN create index: ${collectionId}.${index.key}`)
      continue
    }

    console.log(`[schema] create index: ${collectionId}.${index.key}`)

    try {
      await databases.createIndex({
        databaseId,
        collectionId,
        key: index.key,
        type: index.type,
        attributes: index.attributes,
        orders: index.orders,
        lengths: index.lengths,
      })
    } catch (error) {
      if (!isCode(error, 409)) {
        throw error
      }
    }

    await waitForIndexAvailable({
      databases,
      databaseId,
      collectionId,
      key: index.key,
    })
  }
}

async function main() {
  suppressSdkVersionWarningNoise()

  const dryRun = process.argv.includes('--dry-run')
  const config = readConfig()
  const schemaIds = readSchemaIds()
  const schema = buildSchema(schemaIds)
  const buckets = buildBuckets(schemaIds)

  const client = createClient(config)
  const databases = new Databases(client)
  const storage = new Storage(client)

  console.log(`[schema] start (dryRun=${dryRun})`)

  for (const bucketDef of buckets) {
    await ensureBucket({
      storage,
      bucketDef,
      dryRun,
    })
  }

  for (const collectionDef of schema) {
    const collectionReady = await ensureCollection({
      databases,
      databaseId: config.databaseId,
      collectionDef,
      dryRun,
    })

    if (dryRun && !collectionReady) {
      console.log(
        `[schema] DRY RUN skip attributes/indexes for ${collectionDef.id} because collection would be created.`,
      )
      continue
    }

    await ensureAttributes({
      databases,
      databaseId: config.databaseId,
      collectionDef,
      dryRun,
    })

    await ensureIndexes({
      databases,
      databaseId: config.databaseId,
      collectionDef,
      dryRun,
    })
  }

  console.log('[schema] done')
}

main().catch((error) => {
  console.error('[schema] failed', error)
  process.exit(1)
})

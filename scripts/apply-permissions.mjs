import { Client, Databases, Permission, Role, Storage } from 'node-appwrite'

import { readConfig, readSchemaIds } from './appwrite/env.mjs'
import { buildBuckets, buildSchema } from './appwrite/schema.definitions.mjs'

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
        '[permissions] SDK/server version mismatch warning suppressed for repeated requests ' +
          '(SDK expects 1.8.0, server is 1.7.4).',
      )
    }
  }
}

function createClient(config) {
  return new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey)
}

function buildPermissionsByMode(basePermissions, mode) {
  if (mode === 'strict') {
    return [Permission.create(Role.users())]
  }

  return basePermissions
}

function parseMode() {
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='))
  const mode = modeArg ? modeArg.split('=')[1] : 'baseline'

  if (!['baseline', 'strict'].includes(mode)) {
    throw new Error(`Unsupported mode '${mode}'. Use --mode=baseline or --mode=strict.`)
  }

  return mode
}

async function main() {
  suppressSdkVersionWarningNoise()

  const mode = parseMode()
  const config = readConfig()
  const schemaIds = readSchemaIds()
  const schema = buildSchema(schemaIds)
  const buckets = buildBuckets(schemaIds)

  const client = createClient(config)
  const databases = new Databases(client)
  const storage = new Storage(client)

  console.log(`[permissions] start (mode=${mode})`)

  for (const collection of schema) {
    const permissions = buildPermissionsByMode(collection.permissions, mode)

    await databases.updateCollection({
      databaseId: config.databaseId,
      collectionId: collection.id,
      name: collection.name,
      permissions,
      documentSecurity: collection.documentSecurity,
      enabled: true,
    })

    console.log(`[permissions] updated collection ${collection.id}`)
  }

  for (const bucket of buckets) {
    const permissions = buildPermissionsByMode(bucket.permissions, mode)

    await storage.updateBucket({
      bucketId: bucket.id,
      name: bucket.name,
      permissions,
      fileSecurity: bucket.fileSecurity,
      enabled: bucket.enabled,
      maximumFileSize: bucket.maximumFileSize,
      allowedFileExtensions: bucket.allowedFileExtensions,
      compression: bucket.compression,
      encryption: bucket.encryption,
      antivirus: bucket.antivirus,
      transformations: bucket.transformations,
    })

    console.log(`[permissions] updated bucket ${bucket.id}`)
  }

  console.log('[permissions] done')
}

main().catch((error) => {
  console.error('[permissions] failed', error)
  process.exit(1)
})

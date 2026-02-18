import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'

export const realtime = appwriteClient

export const realtimeService = {
  subscribe: (channels, onEvent) => {
    ensureAppwriteConfigured()
    return realtime.subscribe(channels, onEvent)
  },
}

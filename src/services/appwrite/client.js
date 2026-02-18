import { Client } from 'appwrite'

import { appConfig } from '@/constants/appConfig'

export const appwriteClient = new Client()
  .setEndpoint(appConfig.appwriteEndpoint)
  .setProject(appConfig.appwriteProjectId)

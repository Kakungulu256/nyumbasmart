import { Databases } from 'appwrite'

import { appwriteClient } from '@/services/appwrite/client'

export const databases = new Databases(appwriteClient)

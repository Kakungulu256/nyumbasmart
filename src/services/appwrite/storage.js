import { Storage } from 'appwrite'

import { appwriteClient } from '@/services/appwrite/client'

export const storage = new Storage(appwriteClient)

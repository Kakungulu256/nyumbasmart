import { Functions } from 'appwrite'

import { appwriteClient } from '@/services/appwrite/client'

export const functions = new Functions(appwriteClient)

import { Account } from 'appwrite'

import { appwriteClient } from '@/services/appwrite/client'

export const account = new Account(appwriteClient)

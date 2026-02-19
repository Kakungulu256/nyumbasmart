# Appwrite Functions Workspace

This folder contains deployable function code for NyumbaSmart.

## Functions Included
- `generateLeasePDF`
- `generateReceipt`
- `processMoMoPayment`
- `moMoWebhook`
- `sendNotification`
- `leaseExpiryReminder`
- `rentOverdueChecker`
- `scanUploadedFile`
- `ticketEscalation`

## Manual Setup in Appwrite
1. In Appwrite Console, create one function per folder.
2. Runtime: Node.js.
3. Entrypoint: `src/main.js`.
4. Root directory: the specific function folder (for example `appwrite/functions/sendNotification`).
5. Install dependencies from each function's `package.json`.

## Required Function Environment Variables
- `APPWRITE_FUNCTION_API_ENDPOINT` or `APPWRITE_ENDPOINT`
- `APPWRITE_FUNCTION_PROJECT_ID` or `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY` (server API key for function runtime)
- `APPWRITE_DATABASE_ID`

## Collection and Bucket Defaults
These defaults are used if env variables are not set:
- `NOTIFICATIONS_COLLECTION_ID=notifications`
- `LEASES_COLLECTION_ID=leases`
- `PAYMENTS_COLLECTION_ID=payments`
- `MAINTENANCE_TICKETS_COLLECTION_ID=maintenanceTickets`

Optional:
- `MOMO_WEBHOOK_SECRET` (for `moMoWebhook`)
- `DELETE_SUSPICIOUS_UPLOADS=false` (for `scanUploadedFile`)

## Frontend Integration Toggle
Frontend calls to Appwrite Functions are controlled by:
- `VITE_ENABLE_APPWRITE_FUNCTIONS=true|false`

Set it to `true` only after these functions are deployed in Appwrite.

import { appConfig } from '@/constants/appConfig'

function readEnv(key, fallback) {
  const rawValue = import.meta.env[key]

  if (typeof rawValue !== 'string') {
    return fallback
  }

  const value = rawValue.trim()
  return value || fallback
}

export const appwriteIds = {
  databaseId: appConfig.appwriteDatabaseId,
  collections: {
    users: readEnv('VITE_COLLECTION_USERS_ID', 'users'),
    listings: readEnv('VITE_COLLECTION_LISTINGS_ID', 'listings'),
    applications: readEnv('VITE_COLLECTION_APPLICATIONS_ID', 'applications'),
    leases: readEnv('VITE_COLLECTION_LEASES_ID', 'leases'),
    payments: readEnv('VITE_COLLECTION_PAYMENTS_ID', 'payments'),
    maintenanceTickets: readEnv('VITE_COLLECTION_MAINTENANCE_TICKETS_ID', 'maintenanceTickets'),
    messages: readEnv('VITE_COLLECTION_MESSAGES_ID', 'messages'),
    notifications: readEnv('VITE_COLLECTION_NOTIFICATIONS_ID', 'notifications'),
  },
  buckets: {
    listingImages: readEnv('VITE_BUCKET_LISTING_IMAGES_ID', 'listingImages'),
    leaseDocuments: readEnv('VITE_BUCKET_LEASE_DOCUMENTS_ID', 'leaseDocuments'),
    tenantDocuments: readEnv('VITE_BUCKET_TENANT_DOCUMENTS_ID', 'tenantDocuments'),
    receipts: readEnv('VITE_BUCKET_RECEIPTS_ID', 'receipts'),
    avatars: readEnv('VITE_BUCKET_AVATARS_ID', 'avatars'),
  },
  functions: {
    generateLeasePdf: readEnv('VITE_FUNCTION_GENERATE_LEASE_PDF_ID', 'generateLeasePDF'),
    generateReceipt: readEnv('VITE_FUNCTION_GENERATE_RECEIPT_ID', 'generateReceipt'),
    processMoMoPayment: readEnv('VITE_FUNCTION_PROCESS_MOMO_PAYMENT_ID', 'processMoMoPayment'),
    moMoWebhook: readEnv('VITE_FUNCTION_MOMO_WEBHOOK_ID', 'moMoWebhook'),
    sendNotification: readEnv('VITE_FUNCTION_SEND_NOTIFICATION_ID', 'sendNotification'),
    leaseExpiryReminder: readEnv('VITE_FUNCTION_LEASE_EXPIRY_REMINDER_ID', 'leaseExpiryReminder'),
    rentOverdueChecker: readEnv('VITE_FUNCTION_RENT_OVERDUE_CHECKER_ID', 'rentOverdueChecker'),
    scanUploadedFile: readEnv('VITE_FUNCTION_SCAN_UPLOADED_FILE_ID', 'scanUploadedFile'),
    ticketEscalation: readEnv('VITE_FUNCTION_TICKET_ESCALATION_ID', 'ticketEscalation'),
  },
}

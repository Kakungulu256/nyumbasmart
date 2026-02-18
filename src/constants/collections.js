export const collections = {
  users: import.meta.env.VITE_COLLECTION_USERS_ID ?? 'users',
  listings: import.meta.env.VITE_COLLECTION_LISTINGS_ID ?? 'listings',
  applications: import.meta.env.VITE_COLLECTION_APPLICATIONS_ID ?? 'applications',
  messages: import.meta.env.VITE_COLLECTION_MESSAGES_ID ?? 'messages',
}

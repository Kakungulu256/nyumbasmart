export const appConfig = {
  appwriteEndpoint: import.meta.env.VITE_APPWRITE_ENDPOINT ?? 'https://cloud.appwrite.io/v1',
  appwriteProjectId: import.meta.env.VITE_APPWRITE_PROJECT_ID ?? '',
}

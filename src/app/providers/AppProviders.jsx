import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'

import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function Bootstrapper() {
  useAuthBootstrap()
  return null
}

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Bootstrapper />
        {children}
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
    </QueryClientProvider>
  )
}

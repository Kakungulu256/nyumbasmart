import { Navigate, Route, Routes } from 'react-router-dom'

import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { TenantDashboardPage } from '@/features/dashboard/tenant/pages/TenantDashboardPage'
import { LandlordDashboardPage } from '@/features/dashboard/landlord/pages/LandlordDashboardPage'
import { ListingDetailPage } from '@/features/listings/pages/ListingDetailPage'
import { ListingsPage } from '@/features/listings/pages/ListingsPage'
import { MessagingPage } from '@/features/messaging/pages/MessagingPage'
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage'

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold">Page not found</h1>
    </main>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/listings" replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/listings" element={<ListingsPage />} />
      <Route path="/listings/:listingId" element={<ListingDetailPage />} />
      <Route path="/dashboard/landlord" element={<LandlordDashboardPage />} />
      <Route path="/dashboard/tenant" element={<TenantDashboardPage />} />
      <Route path="/messages" element={<MessagingPage />} />
      <Route path="/payments" element={<PaymentsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

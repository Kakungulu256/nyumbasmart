import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/app/layout/AppLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { LandlordDashboardPage } from '@/features/dashboard/landlord/pages/LandlordDashboardPage'
import { TenantDashboardPage } from '@/features/dashboard/tenant/pages/TenantDashboardPage'
import { ListingDetailPage } from '@/features/listings/pages/ListingDetailPage'
import { ListingsPage } from '@/features/listings/pages/ListingsPage'
import { MessagingPage } from '@/features/messaging/pages/MessagingPage'
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage'

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/listings" replace />} />

        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/verify" element={<VerifyEmailPage />} />

        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:listingId" element={<ListingDetailPage />} />

        <Route
          path="/dashboard/landlord"
          element={
            <ProtectedRoute requireVerified>
              <LandlordDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tenant"
          element={
            <ProtectedRoute requireVerified>
              <TenantDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute requireVerified>
              <MessagingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute requireVerified>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

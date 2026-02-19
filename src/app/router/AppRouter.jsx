import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/app/layout/AppLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { LandlordApplicationsPage } from '@/features/applications/pages/LandlordApplicationsPage'
import { TenantApplicationsPage } from '@/features/applications/pages/TenantApplicationsPage'
import { LandlordDashboardPage } from '@/features/dashboard/landlord/pages/LandlordDashboardPage'
import { TenantDashboardPage } from '@/features/dashboard/tenant/pages/TenantDashboardPage'
import { ListingDetailPage } from '@/features/listings/pages/ListingDetailPage'
import { ListingEditorPage } from '@/features/listings/pages/ListingEditorPage'
import { LandlordListingsPage } from '@/features/listings/pages/LandlordListingsPage'
import { ListingsPage } from '@/features/listings/pages/ListingsPage'
import { MessagingPage } from '@/features/messaging/pages/MessagingPage'
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage'
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
            <ProtectedRoute requireVerified allowedRoles={['landlord']}>
              <LandlordDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/landlord/listings"
          element={
            <ProtectedRoute requireVerified allowedRoles={['landlord']}>
              <LandlordListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/landlord/listings/new"
          element={
            <ProtectedRoute requireVerified allowedRoles={['landlord']}>
              <ListingEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/landlord/listings/:listingId/edit"
          element={
            <ProtectedRoute requireVerified allowedRoles={['landlord']}>
              <ListingEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/landlord/applications"
          element={
            <ProtectedRoute requireVerified allowedRoles={['landlord']}>
              <LandlordApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tenant"
          element={
            <ProtectedRoute requireVerified allowedRoles={['tenant']}>
              <TenantDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tenant/applications"
          element={
            <ProtectedRoute requireVerified allowedRoles={['tenant']}>
              <TenantApplicationsPage />
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
          path="/notifications"
          element={
            <ProtectedRoute requireVerified>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute requireVerified allowedRoles={['tenant']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { getAuthErrorMessage, getPostLoginRoute } from '@/features/auth/utils/authMessages'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/appwrite/auth'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, role, isAuthenticated, isEmailVerified, refreshSession } = useAuth()

  const [verifying, setVerifying] = useState(false)
  const [sending, setSending] = useState(false)
  const [verificationAttempted, setVerificationAttempted] = useState(false)

  const userId = searchParams.get('userId')
  const secret = searchParams.get('secret')
  const sent = searchParams.get('sent') === '1'

  const canVerifyFromLink = useMemo(() => Boolean(userId && secret), [secret, userId])

  useEffect(() => {
    if (!sent) {
      return
    }

    toast.success('Verification email sent.')
  }, [sent])

  useEffect(() => {
    if (!canVerifyFromLink || verifying || verificationAttempted) {
      return
    }

    const run = async () => {
      setVerificationAttempted(true)
      setVerifying(true)

      try {
        await authService.confirmEmailVerification({ userId, secret })
        await refreshSession()
        toast.success('Email verified successfully.')
      } catch (error) {
        toast.error(getAuthErrorMessage(error, 'Unable to verify email from this link.'))
      } finally {
        setVerifying(false)
      }
    }

    run()
  }, [canVerifyFromLink, refreshSession, secret, userId, verificationAttempted, verifying])

  const resendVerification = async () => {
    setSending(true)

    try {
      await authService.requestEmailVerification({
        redirectUrl: `${window.location.origin}/auth/verify`,
      })
      toast.success('Verification email sent again.')
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Unable to resend verification email.'))
    } finally {
      setSending(false)
    }
  }

  const continueToDashboard = () => {
    navigate(getPostLoginRoute(role), { replace: true })
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Verification is required before applying for properties or managing listings."
    >
      {!isAuthenticated && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Login first to continue with verification actions.
        </div>
      )}

      {isAuthenticated && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Signed in as <span className="font-semibold">{user?.email}</span>
        </div>
      )}

      {verifying && <p className="text-sm text-slate-600">Verifying your email link...</p>}

      {isAuthenticated && !isEmailVerified && (
        <Button className="w-full" disabled={sending} onClick={resendVerification} type="button">
          {sending ? 'Sending...' : 'Resend verification email'}
        </Button>
      )}

      {isAuthenticated && isEmailVerified && (
        <Button className="w-full" onClick={continueToDashboard} type="button">
          Continue
        </Button>
      )}

      <div className="text-sm text-slate-600">
        <Link className="text-brand-700 hover:underline" to="/auth/login">
          Back to login
        </Link>
      </div>
    </AuthCard>
  )
}

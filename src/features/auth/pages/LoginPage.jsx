import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/appwrite/auth'
import { getAuthErrorMessage, getPostLoginRoute } from '@/features/auth/utils/authMessages'
import { AuthCard } from '@/features/auth/components/AuthCard'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, refreshSession } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values) => {
    try {
      await authService.loginWithEmail(values)
      const session = await refreshSession()

      if (!session) {
        throw new Error('Unable to restore your session after login.')
      }

      if (!session.user.emailVerification) {
        await logout()
        toast.error('Please verify your email first. Check your inbox and click the verification link.')
        navigate('/auth/login', { replace: true })
        return
      }

      const fallbackRoute = getPostLoginRoute(session.profile?.role)
      const fromRoute = location.state?.from

      toast.success('Welcome back')
      navigate(fromRoute || fallbackRoute, { replace: true })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Unable to log in.'))
    }
  }

  return (
    <AuthCard title="Login" subtitle="Access your tenant or landlord account.">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
            placeholder="you@example.com"
            type="email"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
            placeholder="Your password"
            type="password"
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </label>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link className="text-brand-700 hover:underline" to="/auth/forgot-password">
          Forgot password?
        </Link>
        <Link className="text-slate-600 hover:text-slate-900 hover:underline" to="/auth/register">
          Create account
        </Link>
      </div>
    </AuthCard>
  )
}

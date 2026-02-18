import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button, Input } from '@/components/ui'
import { appConfig } from '@/constants/appConfig'
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
  const { refreshSession } = useAuth()

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

      if (appConfig.enableEmailVerification && !session.user.emailVerification) {
        toast.error('Please verify your email first. Check your inbox and click the verification link.')
        navigate('/auth/verify', { replace: true })
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
        <Input
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="you@example.com"
          type="email"
          {...register('email')}
        />

        <Input
          autoComplete="current-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Your password"
          type="password"
          {...register('password')}
        />

        <Button className="w-full" loading={isSubmitting} loadingText="Signing in..." type="submit">
          Login
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

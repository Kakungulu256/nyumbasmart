import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { getAuthErrorMessage } from '@/features/auth/utils/authMessages'
import { authService } from '@/services/appwrite/auth'

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const userId = searchParams.get('userId')
  const secret = searchParams.get('secret')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values) => {
    if (!userId || !secret) {
      toast.error('Reset link is invalid or incomplete.')
      return
    }

    try {
      await authService.confirmPasswordRecovery({
        userId,
        secret,
        password: values.password,
      })

      toast.success('Password reset successful. Please login.')
      navigate('/auth/login', { replace: true })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Unable to reset password.'))
    }
  }

  return (
    <AuthCard title="Reset password" subtitle="Set a new password for your account.">
      {!userId || !secret ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          This reset link is invalid. Request a new link from the forgot password page.
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium text-slate-700">
            New password
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
              type="password"
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirm password
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
              type="password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </label>

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
      )}

      <p className="text-sm text-slate-600">
        Back to{' '}
        <Link className="text-brand-700 hover:underline" to="/auth/login">
          login
        </Link>
      </p>
    </AuthCard>
  )
}

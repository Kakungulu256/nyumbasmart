import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { getAuthErrorMessage } from '@/features/auth/utils/authMessages'
import { authService } from '@/services/appwrite/auth'

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
})

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (values) => {
    try {
      await authService.requestPasswordRecovery({
        email: values.email,
        redirectUrl: `${window.location.origin}/auth/reset-password`,
      })
      toast.success('Password reset email sent.')
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Unable to send password reset email.'))
    }
  }

  return (
    <AuthCard title="Forgot password" subtitle="We will send a reset link to your email.">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
            type="email"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </label>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Sending...' : 'Send reset email'}
        </Button>
      </form>

      <p className="text-sm text-slate-600">
        Back to{' '}
        <Link className="text-brand-700 hover:underline" to="/auth/login">
          login
        </Link>
      </p>
    </AuthCard>
  )
}

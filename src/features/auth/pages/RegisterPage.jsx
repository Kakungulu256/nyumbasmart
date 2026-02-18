import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { supportedCountries } from '@/constants/countries'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { getAuthErrorMessage, getPostLoginRoute } from '@/features/auth/utils/authMessages'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/appwrite/auth'

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name is required.'),
    lastName: z.string().min(2, 'Last name is required.'),
    email: z.string().email('Enter a valid email address.'),
    phone: z.string().min(8, 'Phone number is required.'),
    country: z.string().min(2, 'Select a country.'),
    role: z.enum(['landlord', 'tenant']),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export function RegisterPage() {
  const navigate = useNavigate()
  const { createProfile, refreshSession } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: 'UG',
      role: 'tenant',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values) => {
    try {
      const name = `${values.firstName} ${values.lastName}`.trim()

      const user = await authService.registerWithEmail({
        email: values.email,
        password: values.password,
        name,
      })

      await authService.loginWithEmail({ email: values.email, password: values.password })

      await createProfile({
        userId: user.$id,
        role: values.role,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        country: values.country,
      })

      await refreshSession()

      toast.success('Account created successfully.')
      navigate(getPostLoginRoute(values.role), { replace: true })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Unable to create your account.'))
    }
  }

  return (
    <AuthCard title="Create account" subtitle="Register as a landlord or tenant.">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            First name
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
              type="text"
              {...register('firstName')}
            />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Last name
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
              type="text"
              {...register('lastName')}
            />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
            type="email"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Phone number
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
            type="tel"
            {...register('phone')}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Country
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
              {...register('country')}
            >
              {supportedCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Role
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700"
              {...register('role')}
            >
              <option value="tenant">Tenant</option>
              <option value="landlord">Landlord</option>
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Password
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
        </div>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-slate-600">
        Already have an account?{' '}
        <Link className="text-brand-700 hover:underline" to="/auth/login">
          Login
        </Link>
      </p>
    </AuthCard>
  )
}

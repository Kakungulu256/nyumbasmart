import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button, FormField, Input, getFieldInputClassName } from '@/components/ui'
import { supportedCountries } from '@/constants/countries'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { getAuthErrorMessage, getPostLoginRoute } from '@/features/auth/utils/authMessages'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/appwrite/auth'

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters.')
      .max(30, 'Username must be at most 30 characters.')
      .regex(/^[a-zA-Z0-9_.]+$/, 'Use only letters, numbers, underscore, or dot.'),
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
      username: '',
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
        username: values.username,
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
        <Input error={errors.username?.message} label="Username" required type="text" {...register('username')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input error={errors.firstName?.message} label="First name" required type="text" {...register('firstName')} />
          <Input error={errors.lastName?.message} label="Last name" required type="text" {...register('lastName')} />
        </div>

        <Input error={errors.email?.message} label="Email" required type="email" {...register('email')} />
        <Input error={errors.phone?.message} label="Phone number" required type="tel" {...register('phone')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField error={errors.country?.message} id="country" label="Country" required>
            <select className={getFieldInputClassName({ hasError: Boolean(errors.country) })} id="country" {...register('country')}>
              {supportedCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField error={errors.role?.message} id="role" label="Role" required>
            <select className={getFieldInputClassName({ hasError: Boolean(errors.role) })} id="role" {...register('role')}>
              <option value="tenant">Tenant</option>
              <option value="landlord">Landlord</option>
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input error={errors.password?.message} label="Password" required type="password" {...register('password')} />
          <Input error={errors.confirmPassword?.message} label="Confirm password" required type="password" {...register('confirmPassword')} />
        </div>

        <Button className="w-full" loading={isSubmitting} loadingText="Creating account..." type="submit">
          Create account
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

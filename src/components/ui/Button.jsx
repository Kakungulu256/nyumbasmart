import { cn } from '@/components/ui/cn'
import { Spinner } from '@/components/ui/Spinner'

const variantClassMap = {
  primary: 'bg-brand-700 text-white hover:bg-brand-900',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/70',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const sizeClassMap = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText = 'Please wait...',
  disabled = false,
  ...props
}) {
  const variantClass = variantClassMap[variant] || variantClassMap.primary
  const sizeClass = sizeClassMap[size] || sizeClassMap.md
  const isDisabled = disabled || loading

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variantClass,
        sizeClass,
        className,
      )}
      disabled={isDisabled}
      type="button"
      {...props}
    >
      {loading && <Spinner size="sm" tone={variant === 'primary' || variant === 'danger' ? 'white' : 'brand'} />}
      {loading ? loadingText : children}
    </button>
  )
}

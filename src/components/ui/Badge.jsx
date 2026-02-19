import { cn } from '@/components/ui/cn'

const variantClassMap = {
  neutral: 'border border-slate-200 bg-slate-100 text-slate-700',
  success: 'border border-brand-200 bg-brand-100 text-brand-900',
  warning: 'border border-amber-200 bg-amber-100 text-amber-900',
  danger: 'border border-red-200 bg-red-100 text-red-700',
  info: 'border border-blue-200 bg-blue-100 text-blue-700',
}

export function Badge({ children, className = '', variant = 'neutral' }) {
  const variantClass = variantClassMap[variant] || variantClassMap.neutral

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', variantClass, className)}>
      {children}
    </span>
  )
}

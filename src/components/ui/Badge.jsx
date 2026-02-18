import { cn } from '@/components/ui/cn'

const variantClassMap = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-brand-100 text-brand-900',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
}

export function Badge({ children, className = '', variant = 'neutral' }) {
  const variantClass = variantClassMap[variant] || variantClassMap.neutral

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide', variantClass, className)}>
      {children}
    </span>
  )
}

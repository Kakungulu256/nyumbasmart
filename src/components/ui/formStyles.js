import { cn } from '@/components/ui/cn'

export const fieldLabelClassName = 'block space-y-1.5 text-sm font-semibold text-slate-700'
export const fieldHintClassName = 'text-xs text-slate-500'
export const fieldErrorClassName = 'text-xs font-medium text-red-600'

export const fieldInputBaseClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-100/80 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

export function getFieldInputClassName({ hasError = false, className = '' } = {}) {
  return cn(
    fieldInputBaseClassName,
    hasError && 'border-red-300 focus:border-red-500 focus:ring-red-100',
    className,
  )
}

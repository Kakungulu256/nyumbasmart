import { cn } from '@/components/ui/cn'

export const fieldLabelClassName = 'block text-sm font-medium text-slate-700'
export const fieldHintClassName = 'mt-1 text-xs text-slate-500'
export const fieldErrorClassName = 'mt-1 text-xs text-red-600'

export const fieldInputBaseClassName =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100'

export function getFieldInputClassName({ hasError = false, className = '' } = {}) {
  return cn(
    fieldInputBaseClassName,
    hasError && 'border-red-300 focus:border-red-500 focus:ring-red-100',
    className,
  )
}

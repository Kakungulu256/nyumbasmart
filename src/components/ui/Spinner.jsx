import { cn } from '@/components/ui/cn'

const sizeClassMap = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-6 w-6 border-[3px]',
}

export function Spinner({ className = '', size = 'sm', tone = 'brand' }) {
  const toneClass = tone === 'white' ? 'border-white/30 border-t-white' : 'border-brand-200 border-t-brand-700'
  const sizeClass = sizeClassMap[size] || sizeClassMap.sm

  return <span aria-hidden className={cn('inline-block animate-spin rounded-full', sizeClass, toneClass, className)} />
}

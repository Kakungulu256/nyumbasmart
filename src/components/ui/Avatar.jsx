import { cn } from '@/components/ui/cn'

const sizeClassMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

function getInitials(name) {
  if (!name || typeof name !== 'string') {
    return '?'
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

export function Avatar({ src = '', alt = '', name = '', size = 'md', className = '' }) {
  const sizeClass = sizeClassMap[size] || sizeClassMap.md
  const initials = getInitials(name || alt)

  return (
    <span className={cn('inline-flex overflow-hidden rounded-full bg-brand-100 text-brand-900', sizeClass, className)}>
      {src ? (
        <img alt={alt || name || 'Avatar'} className="h-full w-full object-cover" loading="lazy" src={src} />
      ) : (
        <span className="m-auto font-semibold">{initials}</span>
      )}
    </span>
  )
}

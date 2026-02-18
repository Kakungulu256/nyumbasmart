import { cn } from '@/components/ui/cn'

export function Card({ children, className = '' }) {
  return <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>{children}</section>
}

export function CardHeader({ children, className = '' }) {
  return <header className={cn('border-b border-slate-100 px-5 py-4', className)}>{children}</header>
}

export function CardTitle({ children, className = '' }) {
  return <h2 className={cn('text-lg font-semibold text-slate-900', className)}>{children}</h2>
}

export function CardBody({ children, className = '' }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
  return <footer className={cn('border-t border-slate-100 px-5 py-4', className)}>{children}</footer>
}

import { Card, CardBody } from '@/components/ui/Card'

export function AuthCard({ title, subtitle, children }) {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardBody className="p-6 sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-700">NyumbaSmart</p>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-6 space-y-4">{children}</div>
      </CardBody>
    </Card>
  )
}

export function AuthCard({ title, subtitle, children }) {
  return (
    <section className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-700">NyumbaSmart</p>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  )
}

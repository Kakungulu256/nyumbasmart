export function PagePlaceholder({ title, subtitle }) {
  return (
    <div className="mx-auto flex min-h-[65vh] w-full items-center py-8">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-700">NyumbaSmart</p>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>
      </section>
    </div>
  )
}

export function PagePlaceholder({ title, subtitle }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-700">NyumbaSmart</p>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>
      </section>
    </main>
  )
}

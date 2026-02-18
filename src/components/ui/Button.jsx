export function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

import { fieldErrorClassName, fieldHintClassName, fieldLabelClassName } from '@/components/ui/formStyles'

export function FormField({ id, label, required = false, hint, error, children }) {
  return (
    <label className={fieldLabelClassName} htmlFor={id}>
      {label && (
        <span>
          {label}
          {required && <span className="ml-1 text-red-600">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <p className={fieldHintClassName}>{hint}</p>}
      {error && <p className={fieldErrorClassName}>{error}</p>}
    </label>
  )
}

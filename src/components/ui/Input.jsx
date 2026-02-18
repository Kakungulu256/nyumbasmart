import { forwardRef } from 'react'

import { cn } from '@/components/ui/cn'
import {
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
  getFieldInputClassName,
} from '@/components/ui/formStyles'

export const Input = forwardRef(function Input(
  {
    id,
    label,
    error,
    hint,
    required = false,
    className = '',
    inputClassName = '',
    type = 'text',
    ...props
  },
  ref,
) {
  const inputId = id || props.name
  const hasError = Boolean(error)

  return (
    <label className={cn(fieldLabelClassName, className)} htmlFor={inputId}>
      {label && (
        <span>
          {label}
          {required && <span className="ml-1 text-red-600">*</span>}
        </span>
      )}
      <input
        {...props}
        aria-invalid={hasError}
        className={getFieldInputClassName({ hasError, className: inputClassName })}
        id={inputId}
        ref={ref}
        type={type}
      />
      {hint && !hasError && <p className={fieldHintClassName}>{hint}</p>}
      {hasError && <p className={fieldErrorClassName}>{error}</p>}
    </label>
  )
})

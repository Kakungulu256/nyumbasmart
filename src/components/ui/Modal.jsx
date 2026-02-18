import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/components/ui/cn'

function handleBackdropClick(event, onClose) {
  if (event.target === event.currentTarget) {
    onClose()
  }
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  closeOnBackdrop = true,
  className = '',
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={closeOnBackdrop ? (event) => handleBackdropClick(event, onClose) : undefined}
      role="presentation"
    >
      <section
        aria-modal="true"
        className={cn('w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl', className)}
        role="dialog"
      >
        <header className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            </div>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
              type="button"
            >
              <span className="sr-only">Close modal</span>
              <span aria-hidden>&times;</span>
            </button>
          </div>
        </header>

        <div className="px-5 py-4">{children}</div>

        {footer && <footer className="border-t border-slate-100 px-5 py-4">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}

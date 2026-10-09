import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import './Modal.css'

/**
 * Standard Design System Modal/Popup component.
 * Features:
 * - Perfectly centered on screen
 * - Locks document body scroll while open
 * - Closes on ESC key
 * - Closes on backdrop click
 * - Accessible dialog role and labels
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {'sm' | 'md' | 'lg' | 'xl' | 'full'} [props.size='md']
 * @param {boolean} [props.closeOnBackdropClick=true]
 * @param {boolean} [props.closeOnEsc=true]
 * @param {boolean} [props.showCloseButton=true]
 * @param {React.ReactNode} [props.header]
 * @param {React.ReactNode} [props.footer]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  header,
  footer,
  children,
  className = '',
}) {
  const modalRef = useRef(null)

  // Lock body scroll when open and unlock upon unmount or close
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // ESC key listener
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeOnEsc, onClose])

  if (!isOpen) return null

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && closeOnBackdropClick) {
      onClose?.()
    }
  }

  return (
    <div
      className="ui-modal-overlay"
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Hộp thoại'}
    >
      <div
        ref={modalRef}
        className={`ui-modal-container ui-modal-container--${size} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {header ? (
          header
        ) : (title || showCloseButton) ? (
          <div className="ui-modal-header">
            <div className="ui-modal-title-group">
              {title && <h3 className="ui-modal-title">{title}</h3>}
              {subtitle && <span className="ui-modal-subtitle">{subtitle}</span>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                className="ui-modal-close-btn"
                onClick={onClose}
                aria-label="Đóng"
                title="Đóng (ESC)"
              >
                <X size={18} />
              </button>
            )}
          </div>
        ) : null}

        {/* Modal Body */}
        <div className="ui-modal-body">{children}</div>

        {/* Modal Footer */}
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}


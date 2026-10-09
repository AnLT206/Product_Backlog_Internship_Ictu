import React from 'react'
import { AlertCircle } from 'lucide-react'
import './FormField.css'

/**
 * FormField wrapper providing Label, Required indicator, Input/Select/Textarea slot,
 * Helper Text, and unified Validation Error text.
 *
 * @param {Object} props
 * @param {string} [props.label]
 * @param {boolean} [props.required=false]
 * @param {string} [props.error]
 * @param {string} [props.helperText]
 * @param {string} [props.htmlFor]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export default function FormField({
  label,
  required = false,
  error,
  helperText,
  htmlFor,
  className = '',
  children,
}) {
  const hasError = Boolean(error)

  // Clone single input/select/textarea child to auto-inject error prop if not explicitly passed
  let renderedChildren = children
  if (React.isValidElement(children) && typeof children.type !== 'string') {
    renderedChildren = React.cloneElement(children, {
      error: children.props.error ?? error,
      id: children.props.id ?? htmlFor,
    })
  }

  return (
    <div className={`ui-form-field ${className}`.trim()}>
      {label && (
        <label className="ui-form-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ui-form-required" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="ui-input-wrapper">
        {renderedChildren}
      </div>

      {hasError && (
        <div className="ui-form-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!hasError && helperText && (
        <div className="ui-form-helper">
          {helperText}
        </div>
      )}
    </div>
  )
}


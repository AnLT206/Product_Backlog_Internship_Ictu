import React, { forwardRef } from 'react'
import './FormField.css'

/**
 * Standard Design System Textarea component.
 */
const Textarea = forwardRef(function Textarea(
  {
    error,
    className = '',
    disabled = false,
    rows = 3,
    ...rest
  },
  ref
) {
  const hasError = Boolean(error)
  const classNames = [
    'ui-textarea',
    hasError ? 'has-error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      aria-invalid={hasError ? 'true' : undefined}
      className={classNames}
      {...rest}
    />
  )
})

export default Textarea


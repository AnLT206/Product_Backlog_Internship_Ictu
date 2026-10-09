import React, { forwardRef } from 'react'
import './FormField.css'

/**
 * Standard Design System Select component.
 */
const Select = forwardRef(function Select(
  {
    error,
    className = '',
    disabled = false,
    children,
    ...rest
  },
  ref
) {
  const hasError = Boolean(error)
  const classNames = [
    'ui-select',
    hasError ? 'has-error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <select
      ref={ref}
      disabled={disabled}
      aria-invalid={hasError ? 'true' : undefined}
      className={classNames}
      {...rest}
    >
      {children}
    </select>
  )
})

export default Select


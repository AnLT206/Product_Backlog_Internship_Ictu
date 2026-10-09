import React, { forwardRef } from 'react'
import './FormField.css'

/**
 * Standard Design System Input component.
 */
const Input = forwardRef(function Input(
  {
    error,
    className = '',
    type = 'text',
    disabled = false,
    ...rest
  },
  ref
) {
  const hasError = Boolean(error)
  const classNames = [
    'ui-input',
    hasError ? 'has-error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      aria-invalid={hasError ? 'true' : undefined}
      className={classNames}
      {...rest}
    />
  )
})

export default Input


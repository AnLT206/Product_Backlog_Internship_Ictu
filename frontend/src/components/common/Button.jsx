import React from 'react'
import './Button.css'

/**
 * Standard Design System Button component.
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.block=false]
 * @param {React.ReactNode} [props.iconLeft]
 * @param {React.ReactNode} [props.iconRight]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  block = false,
  iconLeft,
  iconRight,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const isDisabled = disabled || loading

  const classNames = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    block ? 'ui-btn--block' : '',
    loading ? 'ui-btn--loading' : '',
    isDisabled ? 'ui-btn--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      className={classNames}
      {...rest}
    >
      {loading && <span className="ui-btn__spinner" aria-hidden="true" />}
      {!loading && iconLeft && <span className="ui-btn__icon ui-btn__icon--left">{iconLeft}</span>}
      <span className="ui-btn__label">{children}</span>
      {!loading && iconRight && <span className="ui-btn__icon ui-btn__icon--right">{iconRight}</span>}
    </button>
  )
}


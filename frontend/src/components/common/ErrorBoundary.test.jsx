import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function ProblemChild({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Cố ý gây lỗi render để kiểm tra ErrorBoundary')
  }
  return <div>Component con hoạt động bình thường</div>
}

describe('ErrorBoundary Component Suite', () => {
  // Suppress console.error in vitest output for intentional error
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('renders children smoothly when there is no error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Component con hoạt động bình thường')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('catches error and displays fallback UI without crashing whole app', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Đã xảy ra lỗi giao diện')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument()
  })

  it('resets error state when clicking "Thử lại"', () => {
    const handleReset = vi.fn()
    const { rerender } = render(
      <ErrorBoundary onReset={handleReset}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Đã xảy ra lỗi giao diện')).toBeInTheDocument()

    // Re-render with fixed child before clicking reset
    rerender(
      <ErrorBoundary onReset={handleReset}>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    )

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i })
    fireEvent.click(retryBtn)

    expect(handleReset).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Component con hoạt động bình thường')).toBeInTheDocument()
  })
})

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Button from './Button'

describe('Design System Button Component', () => {
  it('renders children with default primary variant and md size', () => {
    render(<Button>Bấm vào đây</Button>)
    const btn = screen.getByRole('button', { name: /Bấm vào đây/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('ui-btn--primary')
    expect(btn).toHaveClass('ui-btn--md')
    expect(btn).not.toBeDisabled()
  })

  it('renders all variants: secondary, danger, success, outline, ghost', () => {
    const { rerender } = render(<Button variant="secondary">Hủy</Button>)
    expect(screen.getByRole('button')).toHaveClass('ui-btn--secondary')

    rerender(<Button variant="danger">Xóa</Button>)
    expect(screen.getByRole('button')).toHaveClass('ui-btn--danger')

    rerender(<Button variant="success">Hoàn thành</Button>)
    expect(screen.getByRole('button')).toHaveClass('ui-btn--success')

    rerender(<Button variant="outline">Xem chi tiết</Button>)
    expect(screen.getByRole('button')).toHaveClass('ui-btn--outline')

    rerender(<Button variant="ghost">Đóng</Button>)
    expect(screen.getByRole('button')).toHaveClass('ui-btn--ghost')
  })

  it('renders sizes: sm, md, lg and block mode', () => {
    const { rerender } = render(<Button size="sm">Nhỏ</Button>)
    expect(screen.getByRole('button')).toHaveClass('ui-btn--sm')

    rerender(<Button size="lg" block>Lớn toàn màn hình</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('ui-btn--lg')
    expect(btn).toHaveClass('ui-btn--block')
  })

  it('renders loading spinner and disables button when loading=true', () => {
    const handleClick = vi.fn()
    render(
      <Button loading onClick={handleClick}>
        Đang lưu
      </Button>
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(btn.querySelector('.ui-btn__spinner')).toBeInTheDocument()

    fireEvent.click(btn)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('triggers onClick when clicked and not disabled', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Xác nhận</Button>)
    const btn = screen.getByRole('button', { name: /Xác nhận/i })

    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders left and right icons correctly', () => {
    render(
      <Button
        iconLeft={<span data-testid="icon-left">👈</span>}
        iconRight={<span data-testid="icon-right">👉</span>}
      >
        Điều hướng
      </Button>
    )
    expect(screen.getByTestId('icon-left')).toBeInTheDocument()
    expect(screen.getByTestId('icon-right')).toBeInTheDocument()
  })
})


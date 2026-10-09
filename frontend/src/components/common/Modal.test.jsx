import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Modal from './Modal'

describe('Design System Modal Component Suite', () => {
  it('does not render when isOpen=false', () => {
    render(
      <Modal isOpen={false} title="Hộp thoại kiểm thử">
        <p>Nội dung modal</p>
      </Modal>
    )

    expect(screen.queryByText('Hộp thoại kiểm thử')).not.toBeInTheDocument()
    expect(screen.queryByText('Nội dung modal')).not.toBeInTheDocument()
  })

  it('renders centered with title and content when isOpen=true', () => {
    render(
      <Modal isOpen={true} title="Xác nhận phân công" subtitle="Chọn mentor phụ trách">
        <p>Nội dung modal</p>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Xác nhận phân công')).toBeInTheDocument()
    expect(screen.getByText('Chọn mentor phụ trách')).toBeInTheDocument()
    expect(screen.getByText('Nội dung modal')).toBeInTheDocument()
  })

  it('locks body scroll when open and restores it when closed', () => {
    const { rerender } = render(
      <Modal isOpen={true} title="Kiểm tra khóa cuộn">
        <p>Nội dung</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Modal isOpen={false} title="Kiểm tra khóa cuộn">
        <p>Nội dung</p>
      </Modal>
    )

    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('calls onClose when close button (X) is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Tiêu đề modal">
        <p>Nội dung</p>
      </Modal>
    )

    const closeBtn = screen.getByRole('button', { name: /Đóng/i })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking backdrop overlay, but not when clicking inside modal content', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Tiêu đề modal">
        <p data-testid="modal-inner-text">Nội dung bên trong</p>
      </Modal>
    )

    // Click inside modal content
    const innerText = screen.getByTestId('modal-inner-text')
    fireEvent.click(innerText)
    expect(handleClose).not.toHaveBeenCalled()

    // Click on backdrop
    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when pressing ESC key', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Tiêu đề modal">
        <p>Nội dung</p>
      </Modal>
    )

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})


import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FormField from './FormField'
import Input from './Input'
import Select from './Select'
import Textarea from './Textarea'

describe('Design System Form Controls Suite', () => {
  it('renders label with required indicator when required=true', () => {
    render(
      <FormField label="Họ và tên" required htmlFor="fullName">
        <Input id="fullName" placeholder="Nhập họ tên" />
      </FormField>
    )

    expect(screen.getByText('Họ và tên')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nhập họ tên')).toBeInTheDocument()
  })

  it('renders error message and applies has-error class to Input', () => {
    render(
      <FormField label="Email" error="Email không đúng định dạng" htmlFor="userEmail">
        <Input id="userEmail" />
      </FormField>
    )

    const errorMsg = screen.getByRole('alert')
    expect(errorMsg).toHaveTextContent('Email không đúng định dạng')

    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('has-error')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders helper text when no error is present', () => {
    render(
      <FormField label="Mật khẩu" helperText="Tối thiểu 8 ký tự bao gồm chữ và số">
        <Input type="password" />
      </FormField>
    )

    expect(screen.getByText('Tối thiểu 8 ký tự bao gồm chữ và số')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders Select component and responds to value changes', () => {
    render(
      <FormField label="Chuyên ngành">
        <Select data-testid="major-select">
          <option value="cntt">Công nghệ thông tin</option>
          <option value="ktpm">Kỹ thuật phần mềm</option>
        </Select>
      </FormField>
    )

    const select = screen.getByTestId('major-select')
    expect(select).toBeInTheDocument()
    fireEvent.change(select, { target: { value: 'ktpm' } })
    expect(select.value).toBe('ktpm')
  })

  it('renders Textarea with custom rows and error state', () => {
    render(
      <FormField label="Ghi chú" error="Bắt buộc nhập ghi chú lý do">
        <Textarea rows={5} placeholder="Nhập lý do tại đây" />
      </FormField>
    )

    const textarea = screen.getByPlaceholderText('Nhập lý do tại đây')
    expect(textarea).toHaveAttribute('rows', '5')
    expect(textarea).toHaveClass('has-error')
    expect(screen.getByText('Bắt buộc nhập ghi chú lý do')).toBeInTheDocument()
  })
})


import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DataTable from './DataTable'

describe('Design System DataTable Component Suite', () => {
  const sampleColumns = [
    { key: 'code', header: 'Mã TTS', width: '120px' },
    { key: 'name', header: 'Họ và tên', ellipsis: true },
    { key: 'score', header: 'Điểm GPA', align: 'center' },
  ]

  const sampleData = [
    { id: 1, code: 'TTS0001', name: 'Nguyễn Văn An', score: '8.8' },
    { id: 2, code: 'TTS0002', name: 'Trần Thị Bình', score: '8.4' },
  ]

  it('renders table headers and rows accurately', () => {
    render(<DataTable columns={sampleColumns} data={sampleData} />)

    expect(screen.getByText('Mã TTS')).toBeInTheDocument()
    expect(screen.getByText('Họ và tên')).toBeInTheDocument()
    expect(screen.getByText('Điểm GPA')).toBeInTheDocument()

    expect(screen.getByText('TTS0001')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.getByText('8.8')).toBeInTheDocument()
    expect(screen.getByText('TTS0002')).toBeInTheDocument()
  })

  it('renders text ellipsis span when column has ellipsis: true', () => {
    const { container } = render(<DataTable columns={sampleColumns} data={sampleData} />)
    const ellipsisElements = container.querySelectorAll('.ui-table-ellipsis')
    expect(ellipsisElements.length).toBe(2)
  })

  it('renders Empty State when data array is empty', () => {
    render(
      <DataTable
        columns={sampleColumns}
        data={[]}
        emptyTitle="Chưa có thực tập sinh nào"
        emptyDescription="Vui lòng thêm mới hoặc nhập dữ liệu từ Excel."
      />
    )

    expect(screen.getByText('Chưa có thực tập sinh nào')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng thêm mới hoặc nhập dữ liệu từ Excel.')).toBeInTheDocument()
  })

  it('renders Loading Skeleton rows when loading=true', () => {
    const { container } = render(
      <DataTable columns={sampleColumns} data={sampleData} loading skeletonRows={3} />
    )

    const skeletons = container.querySelectorAll('.ui-skeleton-pulse')
    expect(skeletons.length).toBe(3 * sampleColumns.length)
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument()
  })

  it('supports custom table children if provided', () => {
    render(
      <DataTable>
        <div data-testid="custom-table-content">Bảng tùy biến</div>
      </DataTable>
    )

    expect(screen.getByTestId('custom-table-content')).toBeInTheDocument()
  })
})


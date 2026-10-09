import React from 'react'
import { Inbox } from 'lucide-react'
import './DataTable.css'

/**
 * Standard Design System DataTable / DataGrid component.
 * Features:
 * - Responsive container with overflow-x-auto
 * - Text ellipsis support
 * - Shimmering loading skeleton rows
 * - Cohesive empty state
 *
 * @param {Object} props
 * @param {Array<{ key: string, header: React.ReactNode, width?: string, align?: 'left'|'center'|'right', render?: (row: any, index: number) => React.ReactNode, ellipsis?: boolean }>} [props.columns]
 * @param {Array<any>} [props.data]
 * @param {boolean} [props.loading=false]
 * @param {number} [props.skeletonRows=4]
 * @param {string} [props.emptyTitle='Không có dữ liệu']
 * @param {string} [props.emptyDescription='Hiện tại chưa có bản ghi nào để hiển thị trong bảng này.']
 * @param {React.ReactNode} [props.emptyAction]
 * @param {React.ReactNode} [props.emptyIcon]
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children] - Custom table content if not using columns/data props
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  skeletonRows = 4,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Hiện tại chưa có bản ghi nào để hiển thị trong bảng này.',
  emptyAction,
  emptyIcon,
  className = '',
  children,
  ...rest
}) {
  const colSpan = Math.max(1, columns.length)

  return (
    <div className={`ui-table-wrapper ${className}`.trim()} {...rest}>
      <div className="ui-table-container">
        {children ? (
          children
        ) : (
          <table className="ui-table">
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={col.key || idx}
                    style={{
                      width: col.width,
                      textAlign: col.align || 'left',
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, rIdx) => (
                  <tr key={`skel-${rIdx}`}>
                    {columns.map((col, cIdx) => (
                      <td
                        key={`skel-${rIdx}-${cIdx}`}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        <span
                          className="ui-skeleton-pulse"
                          style={{
                            width: cIdx === 0 ? '70%' : cIdx === 1 ? '85%' : '50%',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} style={{ padding: 0 }}>
                    <div className="ui-table-empty">
                      <div className="ui-table-empty__icon">
                        {emptyIcon || <Inbox size={44} />}
                      </div>
                      <h4 className="ui-table-empty__title">{emptyTitle}</h4>
                      <p className="ui-table-empty__desc">{emptyDescription}</p>
                      {emptyAction && (
                        <div className="ui-table-empty__action">
                          {emptyAction}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, rIdx) => (
                  <tr key={row.id ?? rIdx}>
                    {columns.map((col, cIdx) => {
                      const cellValue = row[col.key]
                      const rendered = col.render ? col.render(row, rIdx) : cellValue

                      return (
                        <td
                          key={col.key || cIdx}
                          style={{ textAlign: col.align || 'left' }}
                        >
                          {col.ellipsis ? (
                            <span className="ui-table-ellipsis" title={typeof cellValue === 'string' ? cellValue : undefined}>
                              {rendered}
                            </span>
                          ) : (
                            rendered
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


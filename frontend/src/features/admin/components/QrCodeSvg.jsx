import { useMemo } from 'react'
import { generateQrMatrix } from '../utils/qrCodeGenerator'

/**
 * QrCodeSvg - Component hiển thị mã QR dưới dạng SVG độ phân giải cao
 * Không phụ thuộc thư viện ngoài (Pure React + SVG Path)
 * Tối ưu hóa render qua SVG Path duy nhất giúp in ấn sắc nét tuyệt đối.
 */
export default function QrCodeSvg({
  value = '',
  size = 200,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  margin = 2,
  className = '',
  title = 'Mã QR chấm công',
}) {
  const { viewBoxSize, pathData } = useMemo(() => {
    if (!value) {
      return { viewBoxSize: 25, pathData: '' }
    }
    try {
      const { size: matrixSize, modules } = generateQrMatrix(value)
      const fullSize = matrixSize + margin * 2

      let path = ''
      for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
          if (modules[r][c]) {
            const x = c + margin
            const y = r + margin
            path += `M${x},${y}h1v1h-1z `
          }
        }
      }
      return { viewBoxSize: fullSize, pathData: path }
    } catch {
      return { viewBoxSize: 25, pathData: '' }
    }
  }, [value, margin])

  return (
    <svg
      role="img"
      aria-label={title}
      className={`admin-qr-svg ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <title>{title}</title>
      <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} />
      {pathData && <path d={pathData} fill={fgColor} />}
    </svg>
  )
}

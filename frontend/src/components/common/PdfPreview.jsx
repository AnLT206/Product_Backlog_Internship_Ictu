
/**
 * Functional Component hiển thị tài liệu PDF trực tiếp trên trình duyệt bằng thẻ iframe.
 * 
 * @param {Object} props
 * @param {string} props.fileUrl - Đường dẫn hoặc URL của tài liệu PDF cần hiển thị.
 */
export default function PdfPreview({ fileUrl }) {
  // Kiểm tra nếu chưa có link file
  if (!fileUrl) {
    return (
      <div style={styles.emptyContainer}>
        <p>Chưa có file PDF để hiển thị.</p>
      </div>
    );
  }

  // Tối ưu URL: bật thanh công cụ của trình duyệt và cuộn mượt mà
  const pdfUrl = fileUrl.includes('#') ? fileUrl : `${fileUrl}#toolbar=1&navpanes=0`;

  return (
    <div style={styles.container}>
      <iframe
        src={pdfUrl}
        title="PDF Document"
        style={styles.iframe}
      />
    </div>
  );
}

// Styles đảm bảo hiển thị Full Width và chiều cao 600px
const styles = {
  container: {
    width: '100%',
    height: '600px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#525659', // Màu nền chuẩn của trình đọc PDF
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  },
  emptyContainer: {
    width: '100%',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed #cbd5e1',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    color: '#64748b',
  },
};

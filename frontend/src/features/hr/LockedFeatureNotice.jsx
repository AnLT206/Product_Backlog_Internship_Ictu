import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function LockedFeatureNotice({
  featureName = 'Chức năng chưa kích hoạt',
  reason = 'Chức năng này hiện chưa cần đến trong danh mục 10 User Stories cốt lõi của đợt tiếp nhận và quản lý thực tập sinh. Hệ thống đã tạm khóa để lọc bớt dữ liệu và tối ưu quy trình thao tác theo yêu cầu của HR.',
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        padding: '2.5rem 1rem',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.06)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            border: '2px solid #fee2e2',
          }}
        >
          <Lock size={32} />
        </div>

        <span
          style={{
            display: 'inline-block',
            padding: '4px 14px',
            background: '#f1f5f9',
            color: '#475569',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginBottom: '14px',
          }}
        >
          TRẠNG THÁI: TẠM KHÓA
        </span>

        <h2
          style={{
            fontSize: '1.35rem',
            fontWeight: 750,
            color: '#0f172a',
            margin: '0 0 14px',
          }}
        >
          {featureName}
        </h2>

        <p
          style={{
            color: '#64748b',
            fontSize: '0.925rem',
            lineHeight: 1.65,
            marginBottom: '2rem',
          }}
        >
          {reason}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/hr/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Về Xét duyệt & Tuyển dụng</span>
          </Link>

          <Link
            to="/hr/interns"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            <span>Xem Danh sách TTS</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

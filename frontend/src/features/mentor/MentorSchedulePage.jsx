import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { fetchMentorWeeklySchedules } from '../../api/operations';
import { useAuth } from '../../context/AuthContext';
import './MentorSchedulePage.css';

export default function MentorSchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMentorSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMentorWeeklySchedules();
      const list =
        res && res.ok && Array.isArray(res.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
      setSchedules(list);
    } catch {
      setError('Không thể tải lịch làm việc của Mentor từ HR. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMentorSchedules();
  }, []);

  const getDaysDiff = (sessionDateStr) => {
    if (!sessionDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(sessionDateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalSessions = schedules.length;
  const upcomingSessions = schedules.filter((s) => getDaysDiff(s.session_date) > 0).length;
  const todaySessions = schedules.filter((s) => getDaysDiff(s.session_date) === 0).length;

  return (
    <div className="msp-page" data-testid="mentor-schedule-page">
      <div className="msp-header-card">
        <div className="msp-title-group">
          <h2>
            <Calendar className="text-blue-600" size={24} />
            Lịch làm việc & Hướng dẫn Thực tập (Mentor)
            <span className="msp-badge-live">Dữ liệu từ HR</span>
          </h2>
          <p className="msp-subtitle">
            Lịch làm việc theo phiên của từng tuần do Phòng Nhân sự (HR) xếp lịch và quản lý. Mọi thay đổi điều chỉnh sẽ được cập nhật trực tiếp tại đây.
          </p>
        </div>

        <div className="msp-stats-row">
          <div className="msp-stat-box">
            <span className="msp-stat-box-title">Tổng ca hướng dẫn</span>
            <span className="msp-stat-box-val">{totalSessions}</span>
          </div>
          <div className="msp-stat-box">
            <span className="msp-stat-box-title">Ca hôm nay</span>
            <span className="msp-stat-box-val" style={{ color: '#d97706' }}>
              {todaySessions}
            </span>
          </div>
          <div className="msp-stat-box">
            <span className="msp-stat-box-title">Ca sắp diễn ra</span>
            <span className="msp-stat-box-val" style={{ color: '#2563eb' }}>
              {upcomingSessions}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
          <p>Đang tải lịch làm việc từ HR...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', color: '#991b1b' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginRight: '6px' }} />
          {error}
        </div>
      ) : schedules.length === 0 ? (
        <div className="msp-empty">
          <Calendar size={44} style={{ margin: '0 auto 1rem', color: '#94a3b8' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#334155', margin: '0 0 0.5rem' }}>
            Chưa có lịch làm việc phiên nào được xếp
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Phòng Nhân sự (HR) chưa phân công phiên làm việc nào cho tài khoản của bạn trong tuần này.
          </p>
        </div>
      ) : (
        <div className="msp-grid">
          {schedules.map((item) => {
            const daysDiff = getDaysDiff(item.session_date);
            const isToday = daysDiff === 0;
            const isPast = daysDiff < 0;

            return (
              <div key={item.id} className="msp-card" data-testid={`mentor-schedule-card-${item.id}`}>
                <div className="msp-card-header">
                  <div className="msp-card-date">{item.session_date}</div>
                  <span
                    className={`msp-card-days-tag ${
                      isToday
                        ? 'msp-card-days-tag--today'
                        : isPast
                        ? 'msp-card-days-tag--past'
                        : 'msp-card-days-tag--upcoming'
                    }`}
                  >
                    {isToday ? 'Hôm nay' : isPast ? `Đã xong (${Math.abs(daysDiff)} ngày trước)` : `Còn ${daysDiff} ngày`}
                  </span>
                </div>

                <div className="msp-shift-title">{item.shift_name}</div>

                <div className="msp-meta-item">
                  <Clock size={15} className="text-blue-600 flex-shrink-0" />
                  <span>
                    {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                  </span>
                </div>

                <div className="msp-meta-item">
                  <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                  <span>{item.location || 'P.302 – Trung tâm Phần mềm & AI ICTU'}</span>
                </div>

                {item.notes && (
                  <div className="msp-notes-box">
                    <FileText size={13} style={{ display: 'inline', marginRight: '5px' }} />
                    {item.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

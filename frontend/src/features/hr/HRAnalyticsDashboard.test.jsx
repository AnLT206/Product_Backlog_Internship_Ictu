import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HRAnalyticsDashboard, { buildAnalyticsReportList, INITIAL_REPORT_DATA } from './HRAnalyticsDashboard';
import * as realtimeSync from '../../utils/realtimeSync';

describe('HRAnalyticsDashboard Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('1. Render đầy đủ 4 thực tập sinh chuẩn hóa đồng bộ với thông tin chính xác', async () => {
    render(<HRAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Bảng Tổng hợp Đánh giá Kết quả Thực tập Cuối kỳ')).toBeInTheDocument();
    });

    // Xác nhận 4 TTS chuẩn
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Mai Phương')).toBeInTheDocument();
      expect(screen.getByText('Hoàng Minh Đức')).toBeInTheDocument();
    });

    // Không còn hiển thị các tên cũ lỗi thời Trần Thị Bình, Phạm Minh Đức
    expect(screen.queryByText('Trần Thị Bình')).not.toBeInTheDocument();
    expect(screen.queryByText('Phạm Minh Đức')).not.toBeInTheDocument();

    // Xác nhận các chuyên ngành chuẩn
    expect(screen.getByText(/TTS0003 • Hệ thống thông tin/i)).toBeInTheDocument();
    expect(screen.getByText(/TTS0004 • An toàn thông tin/i)).toBeInTheDocument();
  });

  it('2. Bộ lọc tìm kiếm hoạt động chính xác khi tìm theo tên hoặc mã TTS', async () => {
    render(<HRAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Mai Phương')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Nhập họ tên, mã TTS hoặc chuyên ngành/i);
    fireEvent.change(searchInput, { target: { value: 'Mai Phương' } });

    // Chỉ còn hiển thị Trần Thị Mai Phương
    expect(screen.getByText('Trần Thị Mai Phương')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Hoàng Nam')).not.toBeInTheDocument();
    expect(screen.queryByText('Hoàng Minh Đức')).not.toBeInTheDocument();

    // Đặt lại tìm kiếm
    const resetButton = screen.getByRole('button', { name: /Đặt lại/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('Hoàng Minh Đức')).toBeInTheDocument();
    });
  });

  it('3. buildAnalyticsReportList trích xuất chính xác từ realtime sync state', () => {
    const reports = buildAnalyticsReportList();
    expect(reports.length).toBe(4);
    expect(reports.map((r) => r.name)).toEqual([
      'Nguyễn Văn An',
      'Lê Hoàng Nam',
      'Trần Thị Mai Phương',
      'Hoàng Minh Đức',
    ]);
    expect(reports.find((r) => r.id === 'TTS0003').major).toBe('Hệ thống thông tin');
    expect(reports.find((r) => r.id === 'TTS0004').major).toBe('An toàn thông tin');
  });
});


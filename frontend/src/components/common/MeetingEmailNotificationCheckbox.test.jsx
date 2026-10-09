import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import MeetingEmailNotificationCheckbox, {
  MEETING_EMAIL_TEMPLATE_HTML,
  generateMeetingEmailHtml,
} from './MeetingEmailNotificationCheckbox'

describe('MeetingEmailNotificationCheckbox Component Test Suite', () => {
  it('1. Render checkbox "Gửi email tự động thông báo cho người tham gia"', () => {
    render(<MeetingEmailNotificationCheckbox />)

    const checkbox = screen.getByRole('checkbox', {
      name: /gửi email tự động thông báo cho người tham gia/i,
    })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('2. Khi tick chọn checkbox: kích hoạt trạng thái checked và hiển thị các nút thao tác Template', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<MeetingEmailNotificationCheckbox onChange={handleChange} />)

    const checkbox = screen.getByRole('checkbox', {
      name: /gửi email tự động thông báo cho người tham gia/i,
    })

    // Tick chọn checkbox
    await user.click(checkbox)

    expect(checkbox).toBeChecked()
    expect(handleChange).toHaveBeenCalledTimes(1)

    // Hiển thị thanh thao tác với các nút Preview và Copy Code
    expect(screen.getByTestId('email-template-action-bar')).toBeInTheDocument()
    expect(screen.getByTestId('btn-preview-email-template')).toBeInTheDocument()
    expect(screen.getByTestId('btn-copy-html-template')).toBeInTheDocument()
  })

  it('3. Mở Modal khi bấm "Xem trước Template Email", chuyển đổi tab Live Preview và HTML Code', async () => {
    const user = userEvent.setup()
    render(<MeetingEmailNotificationCheckbox checked={true} />)

    // Bấm nút Xem trước
    const previewBtn = screen.getByTestId('btn-preview-email-template')
    await user.click(previewBtn)

    // Modal xuất hiện
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/template email lịch họp \(responsive html\)/i)).toBeInTheDocument()

    // Mặc định tab Live Preview hiển thị iframe
    expect(screen.getByTestId('email-live-preview-container')).toBeInTheDocument()

    // Chuyển sang tab Mã nguồn HTML
    const codeTab = screen.getByTestId('tab-code-email')
    await user.click(codeTab)

    expect(screen.getByTestId('email-code-block')).toBeInTheDocument()
  })

  it('4. Kiểm tra chuỗi MEETING_EMAIL_TEMPLATE_HTML chuẩn Responsive với Header Logo, Thời gian và Link họp', () => {
    // 1. Kiểm tra cấu trúc HTML Email cơ bản
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('<!DOCTYPE html')
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('<table')

    // 2. Kiểm tra Header Logo ICTU
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('logo-ictu.png')
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('THÔNG BÁO LỊCH HỌP MỚI')

    // 3. Kiểm tra thông tin thời gian & placehoder
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('{{meeting_title}}')
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('{{meeting_time}}')
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('{{meeting_location}}')

    // 4. Kiểm tra link họp & nút Call-To-Action
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('{{meeting_link}}')
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('Tham Gia Cuộc Họp (Join Meeting)')

    // 5. Kiểm tra Inline CSS
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('style="')
    expect(MEETING_EMAIL_TEMPLATE_HTML).toContain('background: linear-gradient')
  })

  it('5. generateMeetingEmailHtml thay thế chính xác các placeholders bằng dữ liệu thực tế', () => {
    const sampleData = {
      recipientName: 'Đặng Tuấn Anh',
      title: 'Họp Kickoff Đề tài AI Vision',
      time: '14:00 - 15:30, Thứ Hai, Ngày 12/10/2026',
      location: 'Google Meet (meet.google.com/abc-defg-hij)',
      host: 'Mentor Trần Văn Long',
      agenda: 'Thảo luận kiến trúc mô hình YOLOv8',
      link: 'https://meet.google.com/abc-defg-hij',
    }

    const htmlOutput = generateMeetingEmailHtml(sampleData)

    expect(htmlOutput).toContain('Đặng Tuấn Anh')
    expect(htmlOutput).toContain('Họp Kickoff Đề tài AI Vision')
    expect(htmlOutput).toContain('14:00 - 15:30, Thứ Hai, Ngày 12/10/2026')
    expect(htmlOutput).toContain('Mentor Trần Văn Long')
    expect(htmlOutput).toContain('Thảo luận kiến trúc mô hình YOLOv8')
    expect(htmlOutput).toContain('https://meet.google.com/abc-defg-hij')
  })
})


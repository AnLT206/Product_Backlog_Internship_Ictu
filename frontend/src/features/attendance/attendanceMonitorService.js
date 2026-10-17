/**
 * attendanceMonitorService.js
 *
 * Tầng Dịch vụ & Mock Data Giám sát Chấm công Thời gian thực (Realtime Attendance Monitor).
 * Kiến trúc phân tầng độc lập:
 *   UI -> attendanceMonitorService -> Mock Data / Simulated Stream
 *
 * Sau này khi Backend hoàn thiện, chỉ cần thay đổi phần implementation
 * (kết nối WebSocket ws:// hoặc Server-Sent Events /api/realtime/attendance)
 * mà không cần viết lại giao diện người dùng.
 */

import { UNIFIED_INTERNS } from '../../utils/unifiedData'

const GATES = [
  {
    gateName: 'Cổng IoT Lab 302',
    deviceName: 'Hikvision DS-K1T671MF (Face/QR)',
    ipAddress: '192.168.10.88',
    location: 'Tầng 3 - Tòa nhà Công nghệ cao',
  },
  {
    gateName: 'Cổng IoT Tòa C1',
    deviceName: 'ZKTeco ProCapture-X (RFID/Barcode)',
    ipAddress: '192.168.10.89',
    location: 'Cổng chính Tòa nhà C1 - CNTT',
  },
  {
    gateName: 'Cổng Trung tâm R&D',
    deviceName: 'Suprema FaceStation F2',
    ipAddress: '192.168.10.90',
    location: 'Khu nghiên cứu Lab AI & IoT',
  },
]

// Mẫu các thông điệp phản hồi từ máy chấm công
const STATUS_MESSAGES = {
  success_checkin: 'Hợp lệ - Ghi nhận vào ca đúng giờ',
  success_checkout: 'Hợp lệ - Ghi nhận tan ca thành công',
  late_checkin: 'Hợp lệ - Đi muộn 12 phút (Có ghi nhận công)',
  failed_debounce: 'Từ chối - Chống dội quét lặp (< 60s)',
  failed_unregistered: 'Từ chối - Thẻ hoặc mã QR chưa được kích hoạt',
}

/**
 * Tạo danh sách sự kiện ban đầu trong ngày hôm nay (17/10/2026)
 */
function createInitialEvents() {
  const baseDate = '2026-10-17'
  const rawList = [
    {
      internCode: 'TTS0001',
      time: '08:12:45',
      eventType: 'check_in',
      method: 'qr',
      gateIdx: 0,
      status: 'success',
      message: STATUS_MESSAGES.success_checkin,
    },
    {
      internCode: 'TTS0002',
      time: '08:14:10',
      eventType: 'check_in',
      method: 'rfid',
      gateIdx: 1,
      status: 'success',
      message: STATUS_MESSAGES.success_checkin,
    },
    {
      internCode: 'TTS0003',
      time: '08:18:22',
      eventType: 'check_in',
      method: 'qr',
      gateIdx: 0,
      status: 'success',
      message: STATUS_MESSAGES.success_checkin,
    },
    {
      internCode: 'TTS0004',
      time: '08:22:50',
      eventType: 'check_in',
      method: 'qr',
      gateIdx: 1,
      status: 'success',
      message: STATUS_MESSAGES.late_checkin,
    },
    {
      internCode: 'TTS0005',
      time: '08:25:12',
      eventType: 'check_in',
      method: 'rfid',
      gateIdx: 0,
      status: 'failed',
      message: STATUS_MESSAGES.failed_unregistered,
    },
    {
      internCode: 'TTS0006',
      time: '08:30:05',
      eventType: 'check_in',
      method: 'qr',
      gateIdx: 2,
      status: 'success',
      message: STATUS_MESSAGES.success_checkin,
    },
    {
      internCode: 'TTS0001',
      time: '08:30:40',
      eventType: 'check_in',
      method: 'qr',
      gateIdx: 0,
      status: 'failed',
      message: STATUS_MESSAGES.failed_debounce,
    },
    {
      internCode: 'TTS0002',
      time: '11:45:18',
      eventType: 'check_out',
      method: 'rfid',
      gateIdx: 1,
      status: 'success',
      message: STATUS_MESSAGES.success_checkout,
    },
  ]

  return rawList.map((item, idx) => {
    const intern = UNIFIED_INTERNS.find((i) => i.code === item.internCode) || {
      id: idx + 1,
      code: item.internCode,
      full_name: `Thực tập sinh ${item.internCode}`,
      email: `${item.internCode.toLowerCase()}@ictu.edu.vn`,
      major: 'Công nghệ thông tin',
      department: 'Phòng Phát triển Phần mềm',
    }
    const gate = GATES[item.gateIdx]

    return {
      id: `evt_init_${idx + 1}`,
      internId: intern.id,
      internCode: intern.code,
      internName: intern.full_name,
      email: intern.email,
      avatar: intern.avatar || null,
      major: intern.major || 'Công nghệ thông tin',
      department: intern.department || 'Phát triển Phần mềm',
      eventType: item.eventType,
      method: item.method,
      deviceName: gate.deviceName,
      gateName: gate.gateName,
      ipAddress: gate.ipAddress,
      location: gate.location,
      timestamp: `${baseDate}T${item.time}Z`,
      timeFormatted: item.time,
      dateFormatted: '17/10/2026',
      status: item.status,
      message: item.message,
      isNew: false,
    }
  }).reverse() // Xếp sự kiện mới nhất lên trên
}

// ── Bộ nhớ đệm sự kiện trong phiên (In-memory Store) ──
let currentEvents = createInitialEvents()
let subscribers = new Set()
let simulationTimer = null
let currentConnectionStatus = 'connected' // 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
let isStreamPaused = false

function notifySubscribers(newEvent = null) {
  subscribers.forEach((callback) => {
    try {
      callback({
        events: [...currentEvents],
        latestEvent: newEvent,
        connectionStatus: currentConnectionStatus,
        isPaused: isStreamPaused,
        metrics: getAttendanceMetrics(),
      })
    } catch {
      // Tránh crash nếu 1 subscriber lỗi
    }
  })
}

/**
 * Đăng ký nhận luồng sự kiện quẹt thẻ realtime
 * @param {Function} callback (data) => void
 * @returns {Function} Hàm hủy đăng ký (unsubscribe)
 */
export function subscribeAttendanceStream(callback) {
  subscribers.add(callback)
  // Gửi snapshot dữ liệu hiện tại ngay khi đăng ký
  callback({
    events: [...currentEvents],
    latestEvent: null,
    connectionStatus: currentConnectionStatus,
    isPaused: isStreamPaused,
    metrics: getAttendanceMetrics(),
  })

  return () => {
    subscribers.delete(callback)
  }
}

/**
 * Tạo một sự kiện quẹt thẻ mới ngẫu nhiên (hoặc tùy biến)
 */
export function generateRandomSwipeEvent(customParams = {}) {
  const internList = UNIFIED_INTERNS.length > 0 ? UNIFIED_INTERNS : [
    { id: 1, code: 'TTS0001', full_name: 'Nguyễn Văn An', email: 'intern@ictu.edu.vn', major: 'Công nghệ thông tin' },
    { id: 2, code: 'TTS0002', full_name: 'Lê Hoàng Nam', email: 'tts02@student.ictu.edu.vn', major: 'Kỹ thuật phần mềm' },
    { id: 3, code: 'TTS0003', full_name: 'Trần Thị Mai Phương', email: 'tts03@student.ictu.edu.vn', major: 'Hệ thống thông tin' },
    { id: 4, code: 'TTS0004', full_name: 'Hoàng Minh Đức', email: 'tts04@student.ictu.edu.vn', major: 'An toàn thông tin' },
  ]

  const randomIntern = internList[Math.floor(Math.random() * internList.length)]
  const randomGate = GATES[Math.floor(Math.random() * GATES.length)]
  const eventType = Math.random() > 0.4 ? 'check_in' : 'check_out'
  const method = Math.random() > 0.35 ? 'qr' : 'rfid'
  const isFailed = Math.random() < 0.1 // 10% tỷ lệ quét lỗi để kiểm thử cảnh báo

  const now = new Date()
  const timeFormatted = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const dateFormatted = now.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  let status = isFailed ? 'failed' : 'success'
  let message = isFailed
    ? STATUS_MESSAGES.failed_debounce
    : eventType === 'check_in'
      ? STATUS_MESSAGES.success_checkin
      : STATUS_MESSAGES.success_checkout

  const newEvent = {
    id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    internId: randomIntern.id,
    internCode: randomIntern.code,
    internName: randomIntern.full_name,
    email: randomIntern.email,
    avatar: randomIntern.avatar || null,
    major: randomIntern.major || 'Công nghệ thông tin',
    department: randomIntern.department || 'Phát triển Phần mềm',
    eventType,
    method,
    deviceName: randomGate.deviceName,
    gateName: randomGate.gateName,
    ipAddress: randomGate.ipAddress,
    location: randomGate.location,
    timestamp: now.toISOString(),
    timeFormatted,
    dateFormatted,
    status,
    message,
    isNew: true,
    ...customParams,
  }

  // Thêm vào đầu mảng và giới hạn tối đa 60 sự kiện để chống tràn RAM
  currentEvents = [newEvent, ...currentEvents.slice(0, 59)]
  notifySubscribers(newEvent)
  return newEvent
}

/**
 * Kích hoạt thủ công một lượt quẹt thẻ (nút bấm "Mô phỏng quẹt thẻ ngay")
 */
export function triggerManualSwipe(params = {}) {
  if (currentConnectionStatus !== 'connected') {
    return null
  }
  return generateRandomSwipeEvent(params)
}

/**
 * Bắt đầu luồng mô phỏng sự kiện tự động theo chu kỳ
 */
export function startRealtimeSimulation(intervalMs = 8000) {
  if (simulationTimer) clearInterval(simulationTimer)
  simulationTimer = setInterval(() => {
    if (!isStreamPaused && currentConnectionStatus === 'connected') {
      generateRandomSwipeEvent()
    }
  }, intervalMs)
}

/**
 * Dừng luồng mô phỏng sự kiện tự động
 */
export function stopRealtimeSimulation() {
  if (simulationTimer) {
    clearInterval(simulationTimer)
    simulationTimer = null
  }
}

/**
 * Tạm dừng hoặc tiếp tục nhận luồng sự kiện
 */
export function togglePauseStream() {
  isStreamPaused = !isStreamPaused
  notifySubscribers()
  return isStreamPaused
}

export function setStreamPaused(paused) {
  isStreamPaused = Boolean(paused)
  notifySubscribers()
}

/**
 * Chuyển đổi trạng thái kết nối (dùng cho testing hoặc mô phỏng mất kết nối)
 */
export function setConnectionStatus(status) {
  currentConnectionStatus = status
  notifySubscribers()
}

/**
 * Tính toán các chỉ số thống kê tổng hợp hôm nay
 */
export function getAttendanceMetrics() {
  const total = currentEvents.length
  const checkInCount = currentEvents.filter((e) => e.eventType === 'check_in').length
  const checkOutCount = currentEvents.filter((e) => e.eventType === 'check_out').length
  const failedCount = currentEvents.filter((e) => e.status === 'failed').length
  const successCount = currentEvents.filter((e) => e.status === 'success').length
  const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : '100.0'

  return {
    totalSwipes: total,
    checkInCount,
    checkOutCount,
    failedCount,
    successCount,
    successRate: `${successRate}%`,
    activeGates: 2, // Lab 302 & Tòa C1
  }
}

/**
 * Xóa sạch danh sách sự kiện hiện tại (dùng để kiểm thử Empty state)
 */
export function clearAttendanceEvents() {
  currentEvents = []
  notifySubscribers()
}

/**
 * Khôi phục lại danh sách sự kiện ban đầu
 */
export function resetAttendanceEvents() {
  currentEvents = createInitialEvents()
  currentConnectionStatus = 'connected'
  isStreamPaused = false
  notifySubscribers()
}

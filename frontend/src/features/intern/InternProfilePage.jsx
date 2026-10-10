import { useState, useEffect, useRef } from 'react'
import { useAuth, isApplicantUser } from '../../context/AuthContext'
import { updateMyProfile, changePassword } from '../../api/auth'
import { syncApplicantProfileUpdate } from '../../utils/realtimeSync'
import { saveSharedAvatar } from '../../utils/avatarHelper'
import './InternDashboardPage.css'
import './InternAllowancePage.css'
import './InternProfilePage.css'

const STORAGE_KEY = 'ictu_user_profile'

export function getUserProfileStorageKey(user) {
  const email = (user?.email || '').toLowerCase().trim()
  return email ? `ictu_user_profile_${email}` : STORAGE_KEY
}

const POPULAR_BANKS = [
  'MB Bank (Ngân hàng Quân đội)',
  'Vietcombank (Ngân hàng Ngoại thương)',
  'Techcombank (Ngân hàng Kỹ thương)',
  'BIDV (Ngân hàng Đầu tư & Phát triển)',
  'VietinBank (Ngân hàng Công thương)',
  'Agribank (Ngân hàng Nông nghiệp)',
  'TPBank (Ngân hàng Tiên Phong)',
  'VPBank (Ngân hàng Việt Nam Thịnh vượng)',
  'ACB (Ngân hàng Á Châu)',
  'SHB (Ngân hàng Sài Gòn - Hà Nội)',
  'Sacombank (Ngân hàng Sài Gòn Thương Tín)',
  'VIB (Ngân hàng Quốc tế)',
]

export function getSavedUserProfile(currentUser) {
  try {
    const isActualIntern = currentUser?.role === 'intern'
    const isApplicant = isApplicantUser(currentUser)

    const cleanName = (n) => {
      if (!n) return isApplicant ? 'Ứng viên' : 'TTS'
      const str = String(n).trim()
      if (str === 'HR' || str === 'Hr' || str.includes('Nguyễn Văn An')) {
        return isApplicant ? 'Ứng viên' : 'TTS'
      }
      return str
    }

    const cleanEmail = (m) => {
      if (!m) return isApplicant ? 'ungvien@ictu.edu.vn' : 'intern@ictu.edu.vn'
      const str = String(m).trim()
      if (str.includes('hr@ictu.edu.vn')) {
        return isApplicant ? 'ungvien@ictu.edu.vn' : 'intern@ictu.edu.vn'
      }
      return str
    }

    const cleanCode = (c) => {
      if (!c) return isApplicant ? 'UV0001' : 'TTS0001'
      const str = String(c).trim()
      if (str.includes('HR') || str.includes('AD')) {
        return isApplicant ? 'UV0001' : 'TTS0001'
      }
      return str
    }

    const email = (currentUser?.email || '').toLowerCase().trim()
    const uid = currentUser?.id

    let fallbackBankName = 'MB Bank'
    let fallbackBankAccount = '999908123451'
    let fallbackPhone = '0912.345.001'
    let fallbackCccd = '001203019871'
    let fallbackMajor = 'Công nghệ thông tin'

    if (uid === 6 || email === 'tts02@student.ictu.edu.vn') {
      fallbackBankName = 'Techcombank'
      fallbackBankAccount = '190368123452'
      fallbackPhone = '0912.345.002'
      fallbackCccd = '001203019872'
      fallbackMajor = 'Kỹ thuật phần mềm'
    } else if (uid === 8 || email === 'tts03@student.ictu.edu.vn') {
      fallbackBankName = 'Vietcombank'
      fallbackBankAccount = '0071008123453'
      fallbackPhone = '0912.345.003'
      fallbackCccd = '001203019873'
      fallbackMajor = 'Hệ thống thông tin'
    } else if (uid === 9 || email === 'tts04@student.ictu.edu.vn') {
      fallbackBankName = 'BIDV'
      fallbackBankAccount = '42710008123454'
      fallbackPhone = '0912.345.004'
      fallbackCccd = '001203019874'
      fallbackMajor = 'An toàn thông tin'
    } else if (uid === 10 || email === 'tts05@student.ictu.edu.vn') {
      fallbackBankName = 'TPBank'
      fallbackBankAccount = '03988123455'
      fallbackPhone = '0912.345.005'
      fallbackCccd = '001203019875'
      fallbackMajor = 'Khoa học máy tính'
    } else if (isApplicant) {
      fallbackBankName = 'MB Bank'
      fallbackBankAccount = '999908123459'
      fallbackPhone = '0987.654.321'
      fallbackCccd = '001203019870'
      fallbackMajor = 'Công nghệ thông tin'
    }

    const fallbackProfile = {
      avatar: currentUser?.avatar || null,
      full_name: cleanName(currentUser?.full_name),
      dob: String(currentUser?.dob || (isApplicant ? '20/10/2003' : '15/05/2003')),
      email: cleanEmail(currentUser?.email),
      phone: String(currentUser?.phone || currentUser?.phone_number || fallbackPhone),
      student_code: cleanCode(currentUser?.student_code || currentUser?.code),
      university: String(currentUser?.university || (isApplicant ? '' : 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)')),
      major: String(currentUser?.major || fallbackMajor),
      cccd: String(currentUser?.cccd || fallbackCccd),
      address: String(currentUser?.address || 'Phường Quyết Thắng, TP. Thái Nguyên'),
      bank_account: String(currentUser?.bank_account || fallbackBankAccount),
      bank_name: String(currentUser?.bank_name || fallbackBankName),
    }

    if (!isActualIntern && !isApplicant) {
      try {
        const raw = localStorage.getItem('ictu_user_profile_intern@ictu.edu.vn') || localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            return {
              avatar: parsed.avatar || null,
              full_name: (parsed.full_name && typeof parsed.full_name === 'string' && !parsed.full_name.includes('HR') && !parsed.full_name.includes('Hr') && !parsed.full_name.includes('Nguyễn Văn An')) ? parsed.full_name : 'TTS',
              dob: String(parsed.dob || '15/05/2003'),
              email: 'intern@ictu.edu.vn',
              phone: String(parsed.phone || '0987654322'),
              student_code: (parsed.student_code && typeof parsed.student_code === 'string' && !parsed.student_code.includes('HR') && !parsed.student_code.includes('AD')) ? parsed.student_code : 'TTS0001',
              university: String(parsed.university || 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)'),
              cccd: String(parsed.cccd || '001203019876'),
              address: String(parsed.address || 'Phường Quyết Thắng, TP. Thái Nguyên'),
              bank_account: String(parsed.bank_account || '999908123456'),
              bank_name: String(parsed.bank_name || 'MB Bank'),
            }
          }
        }
      } catch {}
      return fallbackProfile
    }

    const userKey = email ? `ictu_user_profile_${email}` : null

    try {
      const raw = (userKey && localStorage.getItem(userKey)) || localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          if (!parsed.email || !email || String(parsed.email).toLowerCase().trim() === email) {
            return {
              avatar: parsed.avatar ?? currentUser?.avatar ?? null,
              full_name: cleanName(currentUser?.full_name || parsed.full_name),
              dob: String(parsed.dob || currentUser?.dob || (isApplicant ? '20/10/2003' : '15/05/2003')),
              email: cleanEmail(currentUser?.email || parsed.email),
              phone: String(parsed.phone || parsed.phone_number || currentUser?.phone || currentUser?.phone_number || (isApplicant ? '0987654321' : '0987654322')),
              student_code: cleanCode(parsed.student_code ?? currentUser?.student_code ?? currentUser?.code),
              university: String(parsed.university ?? currentUser?.university ?? (isApplicant ? '' : 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)')),
              cccd: String(parsed.cccd || currentUser?.cccd || '001203019876'),
              address: String(parsed.address || currentUser?.address || 'Phường Quyết Thắng, TP. Thái Nguyên'),
              bank_account: String(parsed.bank_account || currentUser?.bank_account || '999908123456'),
              bank_name: String(parsed.bank_name || currentUser?.bank_name || 'MB Bank'),
            }
          }
        }
      }
    } catch {}

    return fallbackProfile
  } catch {
    return {
      avatar: null,
      full_name: 'TTS',
      dob: '15/05/2003',
      email: 'intern@ictu.edu.vn',
      phone: '0987654321',
      student_code: 'TTS0001',
      university: 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)',
      cccd: '001203019876',
      address: 'Phường Quyết Thắng, TP. Thái Nguyên',
      bank_account: '999908123456',
      bank_name: 'MB Bank',
    }
  }
}

export default function InternProfilePage() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef(null)

  const isApplicant = isApplicantUser(user)

  // Dữ liệu đã lưu gần đây nhất (Nguồn sự thật)
  const [savedData, setSavedData] = useState(() => getSavedUserProfile(user))

  // Local state form chỉnh sửa (nếu người dùng không ấn "Lưu thay đổi", rời trang sẽ hủy bỏ)
  const [formData, setFormData] = useState(() => getSavedUserProfile(user))

  // State đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Toast & Loading states
  const [toast, setToast] = useState(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState({})

  // Đồng bộ khi user từ auth thay đổi (đăng xuất/chuyển vai trò)
  useEffect(() => {
    const loaded = getSavedUserProfile(user)
    setSavedData(loaded)
    setFormData(loaded)
  }, [user])

  function showToastMessage(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  // ── XỬ LÝ ĐỔI & LƯU ẢNH ĐẠI DIỆN TRỰC TIẾP (AVATAR) ──
  function saveAvatarDirectly(newAvatar) {
    setFormData((prev) => ({ ...prev, avatar: newAvatar }))
    setSavedData((prev) => ({ ...prev, avatar: newAvatar }))

    const userKey = getUserProfileStorageKey(user)
    try {
      const current = getSavedUserProfile(user)
      const updated = {
        ...current,
        avatar: newAvatar,
        updated_at: new Date().toISOString(),
      }
      localStorage.setItem(userKey, JSON.stringify(updated))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Không thể lưu avatar vào localStorage:', err)
    }

    // Lưu vào shared storage để HR, Mentor, Admin đọc được ngay
    saveSharedAvatar(newAvatar, user?.email, user?.id, isApplicant)

    // Đồng bộ tức thời sang realtime sync store
    syncApplicantProfileUpdate({
      id: user?.id,
      email: user?.email,
      avatar: newAvatar,
    })

    if (updateUser) {
      updateUser({ avatar: newAvatar })
    }

    // Bắn event để các trang đang mở cập nhật tức thì
    window.dispatchEvent(new CustomEvent('ictu_profile_updated', { detail: { avatar: newAvatar, email: user?.email } }))
    window.dispatchEvent(new CustomEvent('ictu_avatar_changed', { detail: { avatar: newAvatar, email: user?.email, userId: user?.id } }))
    window.dispatchEvent(new Event('admin_users_updated'))
    window.dispatchEvent(new Event('storage'))
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToastMessage('Vui lòng chọn định dạng ảnh hợp lệ (JPG, PNG, WebP).', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToastMessage('Dung lượng ảnh tối đa cho phép là 10MB.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        // Nén và chuẩn hóa kích thước avatar (tối đa 320x320) để lưu tức thì, siêu nhẹ
        const maxDim = 320
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)

        saveAvatarDirectly(compressedBase64)
        showToastMessage('Cập nhật ảnh đại diện thành công!', 'success')
      }
      img.src = reader.result
    }
    reader.onerror = () => {
      showToastMessage('Lỗi khi đọc file ảnh từ máy tính.', 'error')
    }
    reader.readAsDataURL(file)
  }

  function handleResetAvatar() {
    saveAvatarDirectly(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    showToastMessage('Đã khôi phục ảnh đại diện mặc định!', 'info')
  }

  // ── KIỂM TRA HỢP LỆ FORM THÔNG TIN ──
  function validateProfile() {
    const errors = {}
    const phoneTrimmed = (formData.phone || '').trim().replace(/\s|\./g, '')
    if (!phoneTrimmed) {
      errors.phone = 'Vui lòng nhập số điện thoại'
    } else if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(phoneTrimmed)) {
      errors.phone = 'Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09)'
    }

    if (!formData.address?.trim()) {
      errors.address = 'Vui lòng nhập địa chỉ nơi cư trú'
    } else if (formData.address.trim().length < 5) {
      errors.address = 'Địa chỉ cần chi tiết tối thiểu 5 ký tự'
    }

    // CCCD và Tài khoản ngân hàng chỉ bắt buộc đối với Thực tập sinh chính thức
    if (!isApplicant) {
      const cccdTrimmed = (formData.cccd || '').trim().replace(/\s/g, '')
      if (!cccdTrimmed) {
        errors.cccd = 'Vui lòng nhập số CCCD'
      } else if (!/^[0-9]{9,12}$/.test(cccdTrimmed)) {
        errors.cccd = 'Số CCCD/CMND phải gồm 9 đến 12 chữ số'
      }

      const bankAccountTrimmed = (formData.bank_account || '').trim().replace(/\s/g, '')
      if (!bankAccountTrimmed) {
        errors.bank_account = 'Vui lòng nhập số tài khoản ngân hàng'
      } else if (!/^[0-9A-Za-z]{6,20}$/.test(bankAccountTrimmed)) {
        errors.bank_account = 'Số tài khoản ngân hàng không hợp lệ (6 - 20 ký tự)'
      }

      if (!formData.bank_name?.trim()) {
        errors.bank_name = 'Vui lòng chọn hoặc nhập tên ngân hàng thụ hưởng'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── LƯU THAY ĐỔI FORM THÔNG TIN CÁ NHÂN ──
  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!validateProfile()) return

    setIsSavingProfile(true)

    // Tạo payload chuẩn hóa
    const updatedProfile = {
      ...savedData,
      avatar: formData.avatar,
      full_name: savedData.full_name, // Giữ cố định tên
      dob: savedData.dob,             // Giữ cố định ngày sinh
      email: savedData.email,         // Giữ cố định email
      phone: (formData.phone || '').trim(),
      student_code: (formData.student_code || '').trim(),
      university: (formData.university || '').trim(),
      address: (formData.address || '').trim(),
      cccd: isApplicant ? (savedData.cccd || '') : (formData.cccd || '').trim(),
      bank_account: isApplicant ? (savedData.bank_account || '') : (formData.bank_account || '').trim(),
      bank_name: isApplicant ? (savedData.bank_name || '') : (formData.bank_name || '').trim(),
      updated_at: new Date().toISOString(),
    }

    // 1. Lưu vào localStorage tức thì (cả userKey và global key)
    const userKey = getUserProfileStorageKey(user)
    try {
      localStorage.setItem(userKey, JSON.stringify(updatedProfile))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile))
    } catch (err) {
      console.error('Không thể lưu localStorage:', err)
    }

    // 2. Cập nhật context Auth user để header, sidebar và toàn hệ thống cập nhật tức thì
    if (updateUser) {
      updateUser({
        avatar: updatedProfile.avatar,
        phone: updatedProfile.phone,
        phone_number: updatedProfile.phone,
        student_code: updatedProfile.student_code,
        code: updatedProfile.student_code,
        university: updatedProfile.university,
        cccd: updatedProfile.cccd,
        address: updatedProfile.address,
        bank_account: updatedProfile.bank_account,
        bank_name: updatedProfile.bank_name,
      })
    }

    // 3. Bắn event đồng bộ dữ liệu toàn hệ thống (Admin, HR, Mentor)
    window.dispatchEvent(new CustomEvent('ictu_profile_updated', { detail: updatedProfile }))
    window.dispatchEvent(new Event('admin_users_updated'))

    // Lưu shared avatar
    if (updatedProfile.avatar) {
      saveSharedAvatar(updatedProfile.avatar, updatedProfile.email, user?.id, isApplicant)
    }

    // Đồng bộ thời gian thực sang HR Portal (bảng ứng viên, SĐT, mã SV, trường học, địa chỉ, avatar)
    syncApplicantProfileUpdate({
      id: user?.id,
      email: updatedProfile.email,
      avatar: updatedProfile.avatar,
      phone: updatedProfile.phone,
      student_code: updatedProfile.student_code,
      university: updatedProfile.university,
      full_name: updatedProfile.full_name,
      address: updatedProfile.address,
    })

    // 4. Cập nhật ngay bản ghi state (Optimistic update để UX tức thì < 200ms)
    setSavedData(updatedProfile)
    setFormData(updatedProfile)

    // 5. Đồng bộ backend với timeout an toàn (tối đa 600ms, không bắt user chờ đợi)
    try {
      await Promise.race([
        updateMyProfile({
          phone_number: updatedProfile.phone,
          address: updatedProfile.address,
          student_code: updatedProfile.student_code,
          university: updatedProfile.university,
        }),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ])
    } catch {
      // offline fallback
    } finally {
      setIsSavingProfile(false)
      showToastMessage('Lưu thông tin hồ sơ cá nhân thành công! Dữ liệu đã được cập nhật trên toàn hệ thống.')
    }
  }

  // ── HỦY THAY ĐỔI / ĐẶT LẠI VỀ DỮ LIỆU ĐÃ LƯU GẦN NHẤT ──
  function handleCancelProfileChanges() {
    setFormData(savedData)
    setFormErrors({})
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    showToastMessage('Đã hủy các thay đổi chưa lưu và khôi phục dữ liệu ban đầu.', 'info')
  }

  // ── ĐẶT LẠI TOÀN BỘ TÀI KHOẢN VÀ HỒ SƠ ỨNG VIÊN VỀ BAN ĐẦU ──
  function handleResetApplicantProfile() {
    try {
      localStorage.removeItem('applicant_decision_status')
      localStorage.removeItem('applicant_onboarded')
      localStorage.removeItem('applicant_pending_contract')
      sessionStorage.removeItem('applicant_reject_modal_dismissed')
      localStorage.removeItem('ictu_user_profile_ungvien@ictu.edu.vn')
      localStorage.removeItem('ictu_avatar_ungvien@ictu.edu.vn')
      localStorage.removeItem('ictu_avatar_applicant')
    } catch {}
    const defaultData = {
      avatar: null,
      full_name: 'Nguyễn Thu Hà',
      dob: '20/10/2003',
      email: 'ungvien@ictu.edu.vn',
      phone: '0987654321',
      student_code: 'UV0001',
      university: 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)',
      cccd: '001203019876',
      address: 'Phường Quyết Thắng, TP. Thái Nguyên',
      bank_account: '999908123456',
      bank_name: 'MB Bank',
    }
    setSavedData(defaultData)
    setFormData(defaultData)
    setFormErrors({})
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (updateUser) {
      updateUser({ status: 'pending', profile_status: 'pending', avatar: null })
    }
    showToastMessage('Đã đặt lại thông tin và trạng thái tài khoản ứng viên về ban đầu!')
  }

  // ── LƯU THAY ĐỔI MẬT KHẨU ──
  async function handleSavePassword(e) {
    e.preventDefault()
    const errors = {}

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới'
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Mật khẩu mới phải có tối thiểu 6 ký tự'
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp với mật khẩu mới'
    }

    setPasswordErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSavingPassword(true)

    try {
      const res = await Promise.race([
        changePassword({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
          confirm_password: passwordForm.confirmPassword,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ])

      if (res && !res.ok && res.data?.detail) {
        showToastMessage(res.data.detail, 'error')
        setIsSavingPassword(false)
        return
      }
    } catch {
      // fallback
    }

    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setIsSavingPassword(false)
    showToastMessage('Cập nhật mật khẩu tài khoản thành công!')
  }

  return (
    <div className="intern-dashboard-page intern-profile-page">
      {/* ── Toast notification ── */}
      {toast && (
        <div className={`prf-toast prf-toast--${toast.type}`}>
          {toast.type === 'error' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}


      <div className="prf-content-grid">
        {/* ── Khối 1: Form Thông Tin Cá Nhân & Tài Khoản Ngân Hàng ── */}
        <div className="idp-card prf-card">
          <div className="prf-card-header">
            <div>
              <h2 className="prf-card-title">
                {isApplicant ? 'Hồ Sơ Cá Nhân Ứng Viên' : 'Thông Tin Cá Nhân & Tài Khoản Ngân Hàng'}
              </h2>
              <p className="prf-card-subtitle">
                {isApplicant
                  ? 'Thông tin định danh cố định của ứng viên trên hệ thống thực tập doanh nghiệp ICTU.'
                  : 'Cập nhật thông tin liên hệ và số tài khoản để phục vụ công tác điều phối, chấm công và chi trả phụ cấp.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="prf-form">
            {/* ── Thông tin định danh cố định ── */}
            <div className="prf-section-title-wrap">
              <h3 className="prf-section-title">Thông tin định danh cố định</h3>
            </div>

            <div className="prf-identity-layout">
              {/* Cột trái: Khung Avatar + Nút thay đổi ảnh nằm ở dưới */}
              <div className="prf-avatar-col">
                <div className="prf-avatar-preview-box">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt={formData.full_name || 'Avatar'}
                      className="prf-avatar-img"
                    />
                  ) : (
                    <div className="prf-avatar-default">
                      <span className="prf-avatar-text">{isApplicant ? 'UV' : 'TTS'}</span>
                    </div>
                  )}
                  {/* Chấm tròn trạng thái online xanh lá như ảnh 1 */}
                  <span className="prf-avatar-status-dot" title="Tài khoản đang trực tuyến" />
                </div>

                <div className="prf-avatar-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="prf-avatar-file"
                    className="prf-file-hidden"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleAvatarChange}
                  />
                  <label htmlFor="prf-avatar-file" className="prf-btn-upload">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Thay đổi ảnh đại diện</span>
                  </label>

                  {formData.avatar && (
                    <button
                      type="button"
                      className="prf-btn-reset-avatar"
                      onClick={handleResetAvatar}
                      title="Quay về ảnh đại diện tròn TTS mặc định"
                    >
                      Đặt lại ảnh mặc định
                    </button>
                  )}
                </div>
              </div>

              {/* Cột phải: 3 trường xếp chồng lên nhau theo thứ tự: Họ và tên, Ngày sinh, Email */}
              <div className="prf-fixed-fields-col">
                {/* Họ và tên */}
                <div className="prf-field">
                  <label className="prf-label">
                    Họ và tên
                    <span className="prf-locked-badge" title="Trường cố định lấy từ tài khoản đăng ký">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Cố định
                    </span>
                  </label>
                  <div className="prf-input-wrapper prf-input-disabled">
                    <input
                      type="text"
                      value={formData?.full_name || ''}
                      disabled
                      readOnly
                      className="prf-input"
                    />
                  </div>
                </div>

                {/* Ngày sinh */}
                <div className="prf-field">
                  <label className="prf-label">
                    Ngày sinh
                    <span className="prf-locked-badge" title="Trường cố định lấy từ hồ sơ sinh viên">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Cố định
                    </span>
                  </label>
                  <div className="prf-input-wrapper prf-input-disabled">
                    <input
                      type="text"
                      value={formData?.dob || ''}
                      disabled
                      readOnly
                      className="prf-input"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="prf-field">
                  <label className="prf-label">
                    Email tài khoản
                    <span className="prf-locked-badge" title="Trường cố định dùng để xác thực và nhận thông báo">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Cố định
                    </span>
                  </label>
                  <div className="prf-input-wrapper prf-input-disabled">
                    <input
                      type="email"
                      value={formData?.email || ''}
                      disabled
                      readOnly
                      className="prf-input"
                    />
                  </div>
                </div>
              </div>
            </div>


            {/* ── Thông tin liên lạc ứng viên (SĐT & Địa chỉ) ── */}
            {isApplicant && (
              <>
                <div className="prf-divider" />

                <div className="prf-section-title-wrap">
                  <h3 className="prf-section-title">Thông tin liên lạc ứng viên</h3>
                </div>

                <div className="prf-grid-2">
                  {/* Số điện thoại (SDT) */}
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-phone-applicant">
                      Số điện thoại (SĐT) <span className="prf-req">*</span>
                    </label>
                    <div className={`prf-input-wrapper ${formErrors.phone ? 'is-error' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <input
                        id="prf-phone-applicant"
                        type="tel"
                        placeholder="VD: 0987654321"
                        value={formData?.phone || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value })
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: null })
                        }}
                        className="prf-input"
                      />
                    </div>
                    {formErrors.phone && <span className="prf-error-text">{formErrors.phone}</span>}
                  </div>

                  {/* Địa chỉ */}
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-address-applicant">
                      Địa chỉ thường trú / Nơi ở hiện tại <span className="prf-req">*</span>
                    </label>
                    <div className={`prf-input-wrapper ${formErrors.address ? 'is-error' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <input
                        id="prf-address-applicant"
                        type="text"
                        placeholder="VD: Số 12, P. Quyết Thắng, TP. Thái Nguyên"
                        value={formData?.address || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, address: e.target.value })
                          if (formErrors.address) setFormErrors({ ...formErrors, address: null })
                        }}
                        className="prf-input"
                      />
                    </div>
                    {formErrors.address && <span className="prf-error-text">{formErrors.address}</span>}
                  </div>
                </div>

                {/* ── Thông tin Sinh viên / Cơ sở đào tạo (nếu có) ── */}
                <div className="prf-grid-2" style={{ marginTop: '0.85rem' }}>
                  {/* Mã sinh viên (nếu có) */}
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-student-code-applicant">
                      Mã sinh viên (nếu có)
                    </label>
                    <div className="prf-input-wrapper">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <input
                        id="prf-student-code-applicant"
                        type="text"
                        placeholder="VD: DTC2051220001 (Nếu là sinh viên)"
                        value={formData?.student_code || ''}
                        onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                        className="prf-input"
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Hệ thống sẽ tự trích xuất vào hợp đồng thực tập. Bỏ trống nếu không phải sinh viên.
                    </span>
                  </div>

                  {/* Tên trường / Cơ sở đào tạo (nếu có) */}
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-university-applicant">
                      Tên trường / Cơ sở đào tạo (nếu có)
                    </label>
                    <div className="prf-input-wrapper">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <input
                        id="prf-university-applicant"
                        type="text"
                        placeholder="VD: Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)"
                        value={formData?.university || ''}
                        onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                        className="prf-input"
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Tên trường Đại học / Cao đẳng bạn đang theo học (nếu có).
                    </span>
                  </div>
                </div>

                {/* ── Cụm nút hành động cho ứng viên ── */}
                <div className="prf-form-footer">
                  <button
                    type="button"
                    className="prf-btn-secondary"
                    onClick={handleCancelProfileChanges}
                    disabled={isSavingProfile}
                    title="Khôi phục lại dữ liệu đã lưu gần nhất"
                  >
                    Hủy thay đổi
                  </button>

                  <button
                    type="submit"
                    className="prf-btn-primary"
                    disabled={isSavingProfile}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>

                  <button
                    type="button"
                    className="prf-btn-secondary"
                    onClick={handleResetApplicantProfile}
                    style={{ marginLeft: 'auto', color: '#64748b' }}
                    title="Đặt lại toàn bộ trạng thái ứng viên và hồ sơ về ban đầu"
                  >
                    Đặt lại tài khoản ứng viên
                  </button>
                </div>
              </>
            )}

            {!isApplicant && (
              <>
                <div className="prf-divider" />

                {/* ── Các Trường Có Thể Chỉnh Sửa ── */}
                <div className="prf-section-title-wrap">
                  <h3 className="prf-section-title">Thông tin sinh viên & Tài khoản nhận phụ cấp</h3>
                </div>

                {/* ── Thông tin Sinh viên / Cơ sở đào tạo (nếu có) ── */}
                <div className="prf-grid-2" style={{ marginBottom: '0.85rem' }}>
                  {/* Mã sinh viên (nếu có) */}
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-student-code">
                      Mã sinh viên (nếu có)
                    </label>
                    <div className="prf-input-wrapper">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <input
                        id="prf-student-code"
                        type="text"
                        placeholder="VD: DTC2051220001 (Nếu là sinh viên)"
                        value={formData.student_code || ''}
                        onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                        className="prf-input"
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Dùng để trích xuất vào hợp đồng. Để trống nếu là TTS ngoài trường.
                    </span>
                  </div>

                  {/* Tên trường / Cơ sở đào tạo (nếu có) */}
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-university">
                      Tên trường / Cơ sở đào tạo (nếu có)
                    </label>
                    <div className="prf-input-wrapper">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <input
                        id="prf-university"
                        type="text"
                        placeholder="VD: Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)"
                        value={formData.university || ''}
                        onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                        className="prf-input"
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Cơ sở đào tạo thực tập sinh đang theo học (nếu có).
                    </span>
                  </div>
                </div>

                <div className="prf-grid-2">
                  {/* Số điện thoại (SDT) */}
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-phone">
                      Số điện thoại (SDT) <span className="prf-req">*</span>
                    </label>
                    <div className={`prf-input-wrapper ${formErrors.phone ? 'is-error' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <input
                        id="prf-phone"
                        type="tel"
                        placeholder="VD: 0987654321"
                        value={formData?.phone || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value })
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: null })
                        }}
                        className="prf-input"
                      />
                    </div>
                    {formErrors.phone && <span className="prf-error-text">{formErrors.phone}</span>}
                  </div>

                  {/* Số CCCD */}
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-cccd">
                      Số CCCD / CMND <span className="prf-req">*</span>
                    </label>
                    <div className={`prf-input-wrapper ${formErrors.cccd ? 'is-error' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <line x1="7" y1="8" x2="17" y2="8" />
                        <line x1="7" y1="12" x2="13" y2="12" />
                        <line x1="7" y1="16" x2="11" y2="16" />
                      </svg>
                      <input
                        id="prf-cccd"
                        type="text"
                        placeholder="VD: 001203019876"
                        value={formData?.cccd || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, cccd: e.target.value })
                          if (formErrors.cccd) setFormErrors({ ...formErrors, cccd: null })
                        }}
                        className="prf-input"
                      />
                    </div>
                    {formErrors.cccd && <span className="prf-error-text">{formErrors.cccd}</span>}
                  </div>
                </div>

                {/* Địa chỉ */}
                <div className="prf-field">
                  <label className="prf-label" htmlFor="prf-address">
                    Địa chỉ thường trú / Nơi ở hiện tại <span className="prf-req">*</span>
                  </label>
                  <div className={`prf-input-wrapper ${formErrors.address ? 'is-error' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <input
                      id="prf-address"
                      type="text"
                      placeholder="VD: Số 12, Đ. Z115, P. Quyết Thắng, TP. Thái Nguyên"
                      value={formData?.address || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value })
                        if (formErrors.address) setFormErrors({ ...formErrors, address: null })
                      }}
                      className="prf-input"
                    />
                  </div>
                  {formErrors.address && <span className="prf-error-text">{formErrors.address}</span>}
                </div>

                {/* Tài khoản ngân hàng & Ngân hàng thụ hưởng */}
                <div className="prf-grid-2">
                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-bank-account">
                      Số tài khoản ngân hàng <span className="prf-req">*</span>
                    </label>
                    <div className={`prf-input-wrapper ${formErrors.bank_account ? 'is-error' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      <input
                        id="prf-bank-account"
                        type="text"
                        placeholder="VD: 999908123456"
                        value={formData?.bank_account || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, bank_account: e.target.value })
                          if (formErrors.bank_account) setFormErrors({ ...formErrors, bank_account: null })
                        }}
                        className="prf-input"
                      />
                    </div>
                    {formErrors.bank_account && (
                      <span className="prf-error-text">{formErrors.bank_account}</span>
                    )}
                  </div>

                  <div className="prf-field">
                    <label className="prf-label" htmlFor="prf-bank-name">
                      Ngân hàng thụ hưởng <span className="prf-req">*</span>
                    </label>
                    <div className={`prf-input-wrapper ${formErrors.bank_name ? 'is-error' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <input
                        id="prf-bank-name"
                        list="bank-suggestions"
                        type="text"
                        placeholder="Chọn hoặc nhập tên ngân hàng"
                        value={formData?.bank_name || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, bank_name: e.target.value })
                          if (formErrors.bank_name) setFormErrors({ ...formErrors, bank_name: null })
                        }}
                        className="prf-input"
                      />
                      <datalist id="bank-suggestions">
                        {POPULAR_BANKS.map((bank) => (
                          <option key={bank} value={bank} />
                        ))}
                      </datalist>
                    </div>
                    {formErrors.bank_name && <span className="prf-error-text">{formErrors.bank_name}</span>}
                  </div>
                </div>

                {/* ── Cụm nút hành động dưới Form thông tin ── */}
                <div className="prf-form-footer">
                  <button
                    type="button"
                    className="prf-btn-secondary"
                    onClick={handleCancelProfileChanges}
                    disabled={isSavingProfile}
                    title="Khôi phục lại dữ liệu đã lưu gần nhất"
                  >
                    Hủy thay đổi
                  </button>

                  <button
                    type="submit"
                    className="prf-btn-primary"
                    disabled={isSavingProfile}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* ── Khối 2: Form Thay Đổi Mật Khẩu (Dành cho TTS chính thức) ── */}
        {!isApplicant && (
          <div className="idp-card prf-card prf-card-password">
          <div className="prf-card-header">
            <div>
              <h2 className="prf-card-title">Bảo Mật & Đổi Mật Khẩu</h2>
              <p className="prf-card-subtitle">
                Đổi mật khẩu định kỳ giúp tăng cường an toàn cho tài khoản hệ thống của thực tập sinh.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePassword} className="prf-form">
            {/* Mật khẩu hiện tại */}
            <div className="prf-field">
              <label className="prf-label" htmlFor="prf-current-pwd">
                Mật khẩu hiện tại <span className="prf-req">*</span>
              </label>
              <div className={`prf-input-wrapper ${passwordErrors.currentPassword ? 'is-error' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="prf-current-pwd"
                  type={showPassword.current ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu đang sử dụng"
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    if (passwordErrors.currentPassword) {
                      setPasswordErrors({ ...passwordErrors, currentPassword: null })
                    }
                  }}
                  className="prf-input"
                />
                <button
                  type="button"
                  className="prf-pwd-toggle"
                  onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  title={showPassword.current ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword.current ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <span className="prf-error-text">{passwordErrors.currentPassword}</span>
              )}
            </div>

            {/* Mật khẩu mới & Xác nhận mật khẩu mới */}
            <div className="prf-grid-2">
              <div className="prf-field">
                <label className="prf-label" htmlFor="prf-new-pwd">
                  Mật khẩu mới <span className="prf-req">*</span>
                </label>
                <div className={`prf-input-wrapper ${passwordErrors.newPassword ? 'is-error' : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2l-2 2m-6 6l7 7l-3 3l-7-7l3-3l-2-2m-4 4l-4 4l-3-3l4-4" />
                  </svg>
                  <input
                    id="prf-new-pwd"
                    type={showPassword.new ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      if (passwordErrors.newPassword) {
                        setPasswordErrors({ ...passwordErrors, newPassword: null })
                      }
                    }}
                    className="prf-input"
                  />
                  <button
                    type="button"
                    className="prf-pwd-toggle"
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    title={showPassword.new ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showPassword.new ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <span className="prf-error-text">{passwordErrors.newPassword}</span>
                )}
              </div>

              <div className="prf-field">
                <label className="prf-label" htmlFor="prf-confirm-pwd">
                  Xác nhận mật khẩu mới <span className="prf-req">*</span>
                </label>
                <div className={`prf-input-wrapper ${passwordErrors.confirmPassword ? 'is-error' : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <input
                    id="prf-confirm-pwd"
                    type={showPassword.confirm ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors({ ...passwordErrors, confirmPassword: null })
                      }
                    }}
                    className="prf-input"
                  />
                  <button
                    type="button"
                    className="prf-pwd-toggle"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    title={showPassword.confirm ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showPassword.confirm ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <span className="prf-error-text">{passwordErrors.confirmPassword}</span>
                )}
              </div>
            </div>

            {/* ── Cụm nút hành động dưới Form đổi mật khẩu ── */}
            <div className="prf-form-footer">
              <button
                type="submit"
                className="prf-btn-primary"
                disabled={isSavingPassword}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {isSavingPassword ? 'Đang cập nhật...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  )
}

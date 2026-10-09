/**
 * avatarHelper.js
 * Tiện ích lấy và đồng bộ Avatar Thực tập sinh / Ứng viên đa phân hệ (HR, Mentor, TTS, Candidate)
 */

export function getSavedAvatar(email, id = null, name = null) {
  if (typeof window === 'undefined') return null

  const cleanEmail = (email || '').toLowerCase().trim()
  const cleanName = (name || '').toLowerCase().trim()
  const targetId = id ? String(id) : null

  try {
    // 1. Khóa trực tiếp theo email
    if (cleanEmail) {
      const byEmail = localStorage.getItem(`ictu_avatar_${cleanEmail}`)
      if (byEmail && byEmail.startsWith('data:image')) return byEmail
    }

    // 2. Khóa trực tiếp theo user ID
    if (targetId) {
      const byId = localStorage.getItem(`ictu_avatar_${targetId}`)
      if (byId && byId.startsWith('data:image')) return byId
    }

    // 3. Khóa profile người dùng cá nhân theo email
    if (cleanEmail) {
      const profRaw = localStorage.getItem(`ictu_user_profile_${cleanEmail}`)
      if (profRaw) {
        const parsed = JSON.parse(profRaw)
        if (parsed?.avatar && parsed.avatar.startsWith('data:image')) {
          return parsed.avatar
        }
      }
    }

    // 4. Nhận diện vai trò đặc thù (Ứng viên hoặc Thực tập sinh)
    const isApplicant =
      cleanEmail.includes('ungvien') ||
      cleanEmail.includes('applicant') ||
      cleanName.includes('ứng viên') ||
      cleanName.includes('ung vien') ||
      cleanName.includes('applicant')

    const isIntern =
      cleanEmail.includes('intern') ||
      cleanEmail.includes('tts') ||
      cleanName.includes('tts') ||
      cleanName.includes('thực tập sinh') ||
      cleanName.includes('thuc tap sinh') ||
      cleanName.includes('tts0001') ||
      cleanName.includes('tts0002')

    if (isApplicant) {
      const appAvt =
        localStorage.getItem('ictu_avatar_applicant') ||
        localStorage.getItem('ictu_avatar_ungvien@ictu.edu.vn') ||
        localStorage.getItem('ictu_avatar_7')
      if (appAvt && appAvt.startsWith('data:image')) return appAvt
    }

    if (isIntern) {
      const internAvt =
        localStorage.getItem('ictu_avatar_intern') ||
        localStorage.getItem('ictu_avatar_intern@ictu.edu.vn') ||
        localStorage.getItem('ictu_avatar_tts@ictu.edu.vn') ||
        localStorage.getItem('ictu_avatar_5')
      if (internAvt && internAvt.startsWith('data:image')) return internAvt
    }

    // 5. Khóa profile toàn cục ictu_user_profile
    const globalProf = localStorage.getItem('ictu_user_profile')
    if (globalProf) {
      const parsed = JSON.parse(globalProf)
      if (parsed?.avatar && parsed.avatar.startsWith('data:image')) {
        if (!cleanEmail || !parsed.email || parsed.email.toLowerCase().trim() === cleanEmail) {
          return parsed.avatar
        }
      }
    }

    // 6. Kiểm tra trong realtime sync store
    const syncRaw = localStorage.getItem('ictu_realtime_sync_store')
    if (syncRaw) {
      const syncStore = JSON.parse(syncRaw)
      const found = (syncStore.applicants || []).find(
        (a) =>
          (cleanEmail && a.email?.toLowerCase().trim() === cleanEmail) ||
          (targetId && String(a.id) === targetId) ||
          (cleanName && a.full_name?.toLowerCase().trim() === cleanName)
      )
      if (found?.avatar && found.avatar.startsWith('data:image')) {
        return found.avatar
      }
    }

    // 7. Fallback: Nếu là tài khoản TTS hoặc không rõ danh tính
    const fallbackIntern = localStorage.getItem('ictu_avatar_intern')
    if (fallbackIntern && fallbackIntern.startsWith('data:image')) {
      if (!isApplicant) return fallbackIntern
    }
  } catch (err) {
    console.warn('Lỗi đọc avatar:', err)
  }

  return null
}

export function saveSharedAvatar(avatarData, email, id, isApplicant = false) {
  if (typeof window === 'undefined') return

  const cleanEmail = (email || '').toLowerCase().trim()
  try {
    if (cleanEmail) {
      localStorage.setItem(`ictu_avatar_${cleanEmail}`, avatarData || '')
    }
    if (id) {
      localStorage.setItem(`ictu_avatar_${id}`, avatarData || '')
    }
    if (isApplicant || cleanEmail.includes('ungvien')) {
      localStorage.setItem('ictu_avatar_applicant', avatarData || '')
      localStorage.setItem('ictu_avatar_ungvien@ictu.edu.vn', avatarData || '')
    } else {
      localStorage.setItem('ictu_avatar_intern', avatarData || '')
      localStorage.setItem('ictu_avatar_intern@ictu.edu.vn', avatarData || '')
      localStorage.setItem('ictu_avatar_tts@ictu.edu.vn', avatarData || '')
      localStorage.setItem('ictu_avatar_5', avatarData || '')
    }

    // Phát sự kiện toàn hệ thống
    window.dispatchEvent(
      new CustomEvent('ictu_avatar_changed', {
        detail: { avatar: avatarData, email: cleanEmail, id },
      })
    )
  } catch (e) {
    console.warn('Lỗi lưu shared avatar:', e)
  }
}

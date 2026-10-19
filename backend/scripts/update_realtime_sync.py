import re

filepath = r"d:\code vscode\Product_Backlog_Internship_Ictu\frontend\src\utils\realtimeSync.js"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update applicants in DEFAULT_INITIAL_DATA
old_applicants_block = """  applicants: [
    {
      id: 7,
      full_name: 'Ứng viên',
      student_code: '',
      university: '',
      email: 'ungvien@ictu.edu.vn',
      phone: '0987.654.321',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Công nghệ thông tin',
      gpa: '3.55',
      cv_file: null,        // Ban đầu chưa nộp CV
      app_file: null,       // Ban đầu chưa nộp đơn
      contract_file: null,
      applied_at: null,     // Chưa nộp hồ sơ
      status: 'unsubmitted', // 'unsubmitted' | 'pending' | 'approved' | 'rejected'
      avatar: 'UV',
    },
    {
      id: 5,
      full_name: 'Nguyễn Văn An',
      student_code: 'TTS0001',
      email: 'intern@ictu.edu.vn',
      phone: '0912.345.678',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Công nghệ thông tin',
      gpa: '3.65',
      cv_file: 'CV_TTS.pdf',
      app_file: 'Đơn_xin_thực_tập.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0001.pdf',
      applied_at: '28/09/2026',
      status: 'approved',
      avatar: 'TTS',
    },
    {
      id: 6,
      full_name: 'Lê Hoàng Nam',
      student_code: 'TTS0002',
      email: 'tts02@student.ictu.edu.vn',
      phone: '0912.345.002',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Kỹ thuật phần mềm',
      gpa: '3.50',
      cv_file: 'CV_LeHoangNam.pdf',
      app_file: 'Đơn_xin_thực_tập_LeHoangNam.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0002.pdf',
      applied_at: '27/09/2026',
      status: 'approved',
      avatar: 'LN',
    },
    {
      id: 8,
      full_name: 'Trần Thị Mai Phương',
      student_code: 'TTS0003',
      email: 'tts03@student.ictu.edu.vn',
      phone: '0912.345.003',
      faculty: 'Khoa Hệ thống Thông tin Kinh tế',
      major: 'Hệ thống thông tin',
      gpa: '3.72',
      cv_file: 'CV_TranThiMaiPhuong.pdf',
      app_file: 'Đơn_xin_thực_tập_MaiPhuong.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0003.pdf',
      applied_at: '26/09/2026',
      status: 'approved',
      avatar: 'TP',
    },
    {
      id: 9,
      full_name: 'Hoàng Minh Đức',
      student_code: 'TTS0004',
      email: 'tts04@student.ictu.edu.vn',
      phone: '0912.345.004',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'An toàn thông tin',
      gpa: '3.60',
      cv_file: 'CV_HoangMinhDuc.pdf',
      app_file: 'Đơn_xin_thực_tập_MinhDuc.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0004.pdf',
      applied_at: '25/09/2026',
      status: 'approved',
      avatar: 'HD',
    },
  ],"""

new_applicants_block = """  applicants: [
    {
      id: 24,
      full_name: 'Đỗ Hoàng Anh',
      student_code: 'DTC26001',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      email: 'hoanganh@student.ictu.edu.vn',
      phone: '0981.234.001',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Kỹ thuật phần mềm',
      gpa: '3.68',
      cv_file: 'CV_DoHoangAnh_SoftwareEng.pdf',
      app_file: null,
      contract_file: null,
      applied_at: '20/10/2026',
      status: 'pending',
      program_name: null,
      avatar: 'HA',
    },
    {
      id: 25,
      full_name: 'Vũ Thùy Linh',
      student_code: 'DTC26002',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      email: 'thuylinh@student.ictu.edu.vn',
      phone: '0981.234.002',
      faculty: 'Khoa Trí tuệ nhân tạo & Khoa học dữ liệu',
      major: 'Trí tuệ nhân tạo & Khoa học dữ liệu',
      gpa: '3.82',
      cv_file: 'CV_VuThuyLinh_AI_Data.pdf',
      app_file: null,
      contract_file: null,
      applied_at: '20/10/2026',
      status: 'pending',
      program_name: null,
      avatar: 'TL',
    },
    {
      id: 26,
      full_name: 'Phạm Tuấn Kiệt',
      student_code: 'DTC26003',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      email: 'tuankiet@student.ictu.edu.vn',
      phone: '0981.234.003',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'An toàn thông tin',
      gpa: '3.55',
      cv_file: 'CV_PhamTuanKiet_Security.pdf',
      app_file: null,
      contract_file: null,
      applied_at: '20/10/2026',
      status: 'pending',
      program_name: null,
      avatar: 'TK',
    },
    {
      id: 7,
      full_name: 'Nguyễn Thu Hà',
      student_code: 'TTS9999',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      email: 'ungvien@ictu.edu.vn',
      phone: '0987.654.321',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Công nghệ thông tin',
      gpa: '3.55',
      cv_file: 'Quy chế tổ chức thi Olympic AI ICTU 2026 version 3.docx',
      app_file: null,
      contract_file: null,
      applied_at: '19/10/2026',
      status: 'pending',
      program_name: null,
      avatar: 'TH',
    },
    {
      id: 5,
      full_name: 'Nguyễn Văn An',
      student_code: 'TTS0001',
      email: 'intern@ictu.edu.vn',
      phone: '0912.345.678',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Công nghệ thông tin',
      gpa: '3.65',
      cv_file: 'CV_TTS.pdf',
      app_file: 'Đơn_xin_thực_tập.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0001.pdf',
      applied_at: '28/09/2026',
      status: 'approved',
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      avatar: 'TTS',
    },
    {
      id: 6,
      full_name: 'Lê Hoàng Nam',
      student_code: 'TTS0002',
      email: 'tts02@student.ictu.edu.vn',
      phone: '0912.345.002',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Kỹ thuật phần mềm',
      gpa: '3.50',
      cv_file: 'CV_LeHoangNam.pdf',
      app_file: 'Đơn_xin_thực_tập_LeHoangNam.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0002.pdf',
      applied_at: '27/09/2026',
      status: 'approved',
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      avatar: 'LN',
    },
    {
      id: 8,
      full_name: 'Trần Thị Mai Phương',
      student_code: 'TTS0003',
      email: 'tts03@student.ictu.edu.vn',
      phone: '0912.345.003',
      faculty: 'Khoa Hệ thống Thông tin Kinh tế',
      major: 'Hệ thống thông tin',
      gpa: '3.72',
      cv_file: 'CV_TranThiMaiPhuong.pdf',
      app_file: 'Đơn_xin_thực_tập_MaiPhuong.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0003.pdf',
      applied_at: '26/09/2026',
      status: 'approved',
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      avatar: 'TP',
    },
    {
      id: 9,
      full_name: 'Hoàng Minh Đức',
      student_code: 'TTS0004',
      email: 'tts04@student.ictu.edu.vn',
      phone: '0912.345.004',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'An toàn thông tin',
      gpa: '3.60',
      cv_file: 'CV_HoangMinhDuc.pdf',
      app_file: 'Đơn_xin_thực_tập_MinhDuc.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0004.pdf',
      applied_at: '25/09/2026',
      status: 'approved',
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      avatar: 'MD',
    },
  ],"""

assert old_applicants_block in content, "old_applicants_block not found"
content = content.replace(old_applicants_block, new_applicants_block)

# 2. Update mentorAssignments in DEFAULT_INITIAL_DATA
old_mentor_assignments = """  mentorAssignments: [
    {
      id: 1,
      intern_id: 5,
      student: 'Nguyễn Văn An',
      student_code: 'TTS0001 • K20-CNTT',
      company: 'ICTU Software Engineering Lab',
      project: 'Dự án Core API Microservice & Quản lý TTS',
      mentor: 'Trần Hoàng Quân',
      mentor_role: 'Senior Tech Lead',
      mentor_id: 3,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 2,
      intern_id: 6,
      student: 'Lê Hoàng Nam',
      student_code: 'TTS0002 • K20-KTPM',
      company: 'Phòng Đảm bảo Chất lượng Phần mềm (QA Lab)',
      project: 'HR Portal Web App & Tuyển dụng sinh viên',
      mentor: 'Phạm Quốc Hướng',
      mentor_role: 'QA Lead Engineer',
      mentor_id: 4,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 3,
      intern_id: 8,
      student: 'Trần Thị Mai Phương',
      student_code: 'TTS0003 • K21-HTTT',
      company: 'Trung tâm Dữ liệu & Hệ thống Thông tin',
      project: 'Enterprise Data Dashboard & BI',
      mentor: 'Trần Hoàng Quân',
      mentor_role: 'Senior Tech Lead',
      mentor_id: 3,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 4,
      intern_id: 9,
      student: 'Hoàng Minh Đức',
      student_code: 'TTS0004 • K20-ATTT',
      company: 'Trung tâm An toàn Thông tin & Tác chiến mạng',
      project: 'Security Infrastructure, SSO & Pentest Web API',
      mentor: 'Phạm Quốc Hướng',
      mentor_role: 'QA Lead Engineer',
      mentor_id: 4,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
  ],"""

new_mentor_assignments = """  mentorAssignments: [
    {
      id: 1,
      intern_id: 5,
      student: 'Nguyễn Văn An',
      student_code: 'TTS0001 • K20-CNTT',
      company: 'ICTU Software Engineering Lab',
      project: 'Dự án Core API Microservice & Quản lý TTS',
      program_id: 1,
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      mentor: 'Trần Hoàng Quân',
      mentor_role: 'Senior Tech Lead',
      mentor_id: 3,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 2,
      intern_id: 6,
      student: 'Lê Hoàng Nam',
      student_code: 'TTS0002 • K20-KTPM',
      company: 'Phòng Đảm bảo Chất lượng Phần mềm (QA Lab)',
      project: 'HR Portal Web App & Tuyển dụng sinh viên',
      program_id: 1,
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      mentor: 'Phạm Quốc Hướng',
      mentor_role: 'QA Lead Engineer',
      mentor_id: 4,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 3,
      intern_id: 8,
      student: 'Trần Thị Mai Phương',
      student_code: 'TTS0003 • K21-HTTT',
      company: 'Trung tâm Dữ liệu & Hệ thống Thông tin',
      project: 'Enterprise Data Dashboard & BI',
      program_id: 1,
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      mentor: 'Trần Hoàng Quân',
      mentor_role: 'Senior Tech Lead',
      mentor_id: 3,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 4,
      intern_id: 9,
      student: 'Hoàng Minh Đức',
      student_code: 'TTS0004 • K20-ATTT',
      company: 'Trung tâm An toàn Thông tin & Tác chiến mạng',
      project: 'Security Infrastructure, SSO & Pentest Web API',
      program_id: 1,
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      mentor: 'Phạm Quốc Hướng',
      mentor_role: 'QA Lead Engineer',
      mentor_id: 4,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
  ],"""

assert old_mentor_assignments in content, "old_mentor_assignments not found"
content = content.replace(old_mentor_assignments, new_mentor_assignments)

# 3. Add checkInternContractSigned and syncSendContractToApplicant if not present
check_func = """/**
 * 4.1 Kiểm tra xem một thực tập sinh đã ký hợp đồng tiếp nhận thực tập hay chưa.
 * Đảm bảo chỉ những TTS ĐÃ KÝ HỢP ĐỒNG mới được phép phân công Mentor / Nhóm.
 */
export function checkInternContractSigned(intern, syncContracts = []) {
  if (!intern) return false;
  const code = (intern.code || intern.student_code || '').toUpperCase().trim();
  const email = (intern.email || '').toLowerCase().trim();
  const name = (intern.full_name || '').trim();
  const id = Number(intern.id);

  // 1. Các tài khoản TTS chính thức có sẵn (TTS0001 - TTS0004) luôn coi là đã ký HĐ
  if (code.startsWith('TTS') && code !== 'TTS9999') return true;
  if (id === 5 || id === 6 || id === 8 || id === 9) return true;
  if (email === 'intern@ictu.edu.vn' || email.startsWith('tts') || email.includes('an.nv') || email.includes('nam.lh')) {
    return true;
  }

  // 2. Tra cứu trong danh sách contracts
  const contractList = syncContracts && syncContracts.length > 0 ? syncContracts : (getRealtimeSyncState().contracts || []);
  const match = contractList.find((c) => {
    const cId = Number(c.intern_id);
    const cEmail = (c.email || '').toLowerCase().trim();
    const cName = (c.student_name || '').trim();
    return (
      (cId && cId === id) ||
      (cEmail && email && cEmail === email) ||
      (cName && name && cName === name)
    );
  });

  if (match) {
    return Boolean(
      match.signed_intern === true ||
      match.status === 'completed' ||
      match.status === 'active' ||
      (match.status_label && match.status_label.includes('Hoàn tất'))
    );
  }

  // 3. Nếu là ứng viên mới (pending hoặc mã DTC) và chưa có hợp đồng đã ký -> false
  if (intern.status === 'pending' || intern.status === 'unsubmitted' || code.startsWith('DTC') || code.startsWith('UV')) {
    return false;
  }

  return true;
}

/**
 * 4.2 Tự động phát hành Hợp đồng tiếp nhận khi HR duyệt hồ sơ ứng viên
 */
export function syncSendContractToApplicant(applicantId, applicantInfo = {}) {
  const state = getRealtimeSyncState();
  const app = state.applicants.find((a) => a.id === applicantId) || applicantInfo;
  const studentName = app.full_name || applicantInfo.full_name || 'Ứng viên Thực tập';
  const studentCode = app.student_code || applicantInfo.student_code || `DTC${applicantId}`;
  const studentEmail = app.email || applicantInfo.email || '';
  const faculty = app.faculty || app.major || 'Khoa Công nghệ Thông tin';

  const newContract = {
    id: Date.now() + Number(applicantId),
    intern_id: Number(applicantId),
    contract_code: `HĐTT-2026-${String(applicantId).padStart(3, '0')}`,
    student_name: studentName,
    student_code: studentCode,
    email: studentEmail,
    faculty: faculty,
    doc_type: 'Hợp đồng Tiếp nhận Thực tập Doanh nghiệp & Cam kết Bảo mật (NDA)',
    duration: '03 tháng (Từ 01/10/2026 đến 31/12/2026)',
    allowance: '3.000.000 đ/tháng',
    created_at: new Date().toLocaleDateString('vi-VN'),
    signed_intern: false,
    signed_company: true,
    signed_ictu: true,
    status: 'pending_intern',
    status_label: 'Chờ sinh viên ký số',
    cert: 'ICTU & Doanh nghiệp đã ký duyệt',
  };

  // Tránh trùng lặp hợp đồng
  state.contracts = (state.contracts || []).filter((c) => Number(c.intern_id) !== Number(applicantId));
  state.contracts.unshift(newContract);

  // Đổi trạng thái applicant sang approved
  const existingAppIdx = state.applicants.findIndex((a) => a.id === applicantId);
  if (existingAppIdx >= 0) {
    state.applicants[existingAppIdx].status = 'approved';
    state.applicants[existingAppIdx].contract_file = `HopDong_TiepNhan_${studentCode}.pdf`;
  }

  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_SENT, {
    applicantId,
    contract: newContract,
    studentName,
  });
  return newContract;
}
"""

if "checkInternContractSigned" not in content:
    content = content.replace("export function syncContractSigning(internId, studentName = '') {", check_func + "\nexport function syncContractSigning(internId, studentName = '') {")

# 4. Update syncMentorAssignment with options
old_sync_mentor = """export function syncMentorAssignment(mentorId, mentorName, internIds, projectName = 'Dự án Phát triển Hệ thống') {
  const state = getRealtimeSyncState();

  if (state.unassigned_intern_ids) {
    state.unassigned_intern_ids = state.unassigned_intern_ids.filter((id) => !internIds.includes(id));
  }

  // Bỏ các phân công cũ của mentor này nếu sinh viên không còn nằm trong internIds
  state.mentorAssignments = state.mentorAssignments.filter(
    (m) => m.mentor_id !== mentorId || internIds.includes(m.intern_id)
  );

  internIds.forEach((internId) => {
    const internObj = state.applicants.find((a) => a.id === internId);
    const studentName = internObj?.full_name || `TTS #${internId}`;
    const studentCode = internObj?.student_code || `TTS000${internId}`;

    const existingIdx = state.mentorAssignments.findIndex((m) => m.intern_id === internId);
    const assignRecord = {
      id: Date.now() + internId,
      intern_id: internId,
      student: studentName,
      student_code: `${studentCode} • CNTT`,
      company: 'ICTU Software Engineering Lab',
      project: projectName,
      mentor: mentorName,
      mentor_role: 'Mentor Hướng dẫn',
      mentor_id: mentorId,
      status: 'assigned',
      status_label: 'Đã phân công',
    };

    if (existingIdx >= 0) {
      state.mentorAssignments[existingIdx] = assignRecord;
    } else {
      state.mentorAssignments.push(assignRecord);
    }
  });

  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.MENTOR_ASSIGNED, {
    mentorId,
    mentorName,
    internIds,
    count: internIds.length,
  });
}"""

new_sync_mentor = """export function syncMentorAssignment(mentorId, mentorName, internIds, projectName = 'Dự án Phát triển Hệ thống', options = {}) {
  const state = getRealtimeSyncState();

  if (state.unassigned_intern_ids) {
    state.unassigned_intern_ids = state.unassigned_intern_ids.filter((id) => !internIds.includes(id));
  }

  // Bỏ các phân công cũ của mentor này nếu sinh viên không còn nằm trong internIds
  state.mentorAssignments = state.mentorAssignments.filter(
    (m) => m.mentor_id !== mentorId || internIds.includes(m.intern_id)
  );

  const resolvedProgName =
    options.programName ||
    (projectName && projectName.includes('Kỳ') ? projectName : 'Khóa K20 - Kỳ Thu 2026');
  const resolvedProgId = options.programId || 1;
  const resolvedDeptName = options.departmentName || 'Trung tâm Phát triển Phần mềm ICTU';
  const resolvedGroupName = options.groupName || projectName;

  internIds.forEach((internId) => {
    const internObj = state.applicants.find((a) => a.id === internId);
    const studentName = internObj?.full_name || `TTS #${internId}`;
    const studentCode = internObj?.student_code || `TTS000${internId}`;

    const existingIdx = state.mentorAssignments.findIndex((m) => m.intern_id === internId);
    const assignRecord = {
      id: Date.now() + internId,
      intern_id: internId,
      student: studentName,
      student_code: `${studentCode} • CNTT`,
      company: resolvedDeptName,
      project: projectName,
      program_id: resolvedProgId,
      program_name: resolvedProgName,
      department_id: options.departmentId || null,
      department_name: resolvedDeptName,
      group_id: options.groupId || null,
      group_name: resolvedGroupName,
      mentor: mentorName,
      mentor_role: 'Mentor Hướng dẫn',
      mentor_id: mentorId,
      status: 'assigned',
      status_label: 'Đã phân công',
      assigned_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      state.mentorAssignments[existingIdx] = assignRecord;
    } else {
      state.mentorAssignments.push(assignRecord);
    }

    // Cập nhật đa phân hệ vào danh sách applicants
    const appIdx = state.applicants.findIndex((a) => a.id === internId);
    if (appIdx >= 0) {
      state.applicants[appIdx] = {
        ...state.applicants[appIdx],
        program_id: resolvedProgId,
        program_name: resolvedProgName,
        mentor_id: mentorId,
        mentor_name: mentorName,
        department_name: resolvedDeptName,
        group_name: resolvedGroupName,
      };
    }
  });

  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.MENTOR_ASSIGNED, {
    mentorId,
    mentorName,
    internIds,
    count: internIds.length,
    programName: resolvedProgName,
  });
}"""

if old_sync_mentor in content:
    content = content.replace(old_sync_mentor, new_sync_mentor)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")

import { useState, useEffect, useRef } from 'react';


export default function TaskProgressModal({ isOpen, task, onClose, onSave }) {
  const [subtasks, setSubtasks] = useState(
    Array.isArray(task?.subtasks) ? task.subtasks : []
  );
  const [status, setStatus] = useState(task?.status || 'doing');
  const [note, setNote] = useState(task?.note || '');
  const [prLink, setPrLink] = useState(task?.prLink || '');
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const textareaRef = useRef(null);

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setSubtasks(Array.isArray(task.subtasks) ? task.subtasks : []);
      setStatus(task.status || 'doing');
      setNote(task.note || '');
      setPrLink(task.prLink || '');
      setShowAttachInput(false);
      setAttachUrl('');
      setIsAdding(false);
      setNewSubtaskText('');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  // Dynamic progress calculation
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((st) => st.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Toggle subtask status
  const handleToggleSubtask = (id) => {
    setSubtasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // Add new subtask
  const handleAddSubtask = (e) => {
    if (e) e.preventDefault();
    if (!newSubtaskText.trim()) return;
    const newItem = {
      id: `st-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
    };
    setSubtasks((prev) => [...prev, newItem]);
    setNewSubtaskText('');
    setIsAdding(false);
  };

  // Delete subtask
  const handleDeleteSubtask = (id) => {
    setSubtasks((prev) => prev.filter((item) => item.id !== id));
  };

  // Insert PR link
  const handleApplyAttachLink = () => {
    const linkToInsert = attachUrl.trim() || prLink || 'https://github.com/ictu-interns/core-api/pull/102';
    const prFormatted = `\nPull Request: ${linkToInsert}`;
    setNote((prev) => (prev ? `${prev}${prFormatted}` : prFormatted.trim()));
    setPrLink(linkToInsert);
    setShowAttachInput(false);
    setAttachUrl('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        progress: progressPercent,
        status,
        note,
        subtasks,
        prLink,
      });
    }
    if (onClose) {
      onClose();
    }
  };

  // Tags list
  const tags = task.tags || ['FastAPI', 'Backend'];

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 style={styles.headerTitle}>Cập nhật tiến độ nhiệm vụ</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            title="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {/* Task Name & Tags Box */}
        <div style={styles.taskBanner}>
          <span style={styles.taskLabel}>Nhiệm vụ:</span>
          <div style={styles.taskTitleRow}>
            <h3 style={styles.taskTitle}>{task.title || 'Phát triển REST API Quản lý Hồ sơ Thực tập sinh'}</h3>
          </div>
          {task.description && (
            <p style={{ margin: '6px 0 10px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {task.description}
            </p>
          )}
          <div style={styles.tagGroup}>
            {tags.map((tag) => (
              <span key={tag} style={tag === 'FastAPI' ? styles.tagBlue : styles.tagPurple}>
                {tag}
              </span>
            ))}
            <span style={styles.tagGray}>#BACKEND-104</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {/* 1. Bộ đo tiến độ (Dynamic Progress Bar) */}
          <div style={styles.section}>
            <div style={styles.progressHeader}>
              <div style={styles.progressTitleGroup}>
                <span style={styles.progressLabel}>Tiến độ hoàn thành:</span>
                <strong style={styles.progressValue}>{progressPercent}%</strong>
              </div>
              <span style={styles.progressBadge}>
                {completedSubtasks}/{totalSubtasks} đầu việc
              </span>
            </div>

            <div style={styles.progressBarTrack}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${progressPercent}%`,
                  backgroundColor: '#2563EB',
                }}
              />
            </div>
          </div>

          {/* 2. Danh sách Checklist việc con (Subtasks) */}
          <div style={styles.section}>
            <div style={styles.subtasksHeaderRow}>
              <label style={styles.fieldLabel}>Danh sách việc con (Checklist):</label>
              {!isAdding && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  style={styles.addSubtaskBtn}
                >
                  + Thêm việc con
                </button>
              )}
            </div>

            <div style={styles.subtaskList}>
              {subtasks.length === 0 && !isAdding && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '13px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                  Chưa có việc con nào. Nhấn <strong>"+ Thêm việc con"</strong> ở trên để tự tạo và nhập việc con bằng tay.
                </div>
              )}
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleToggleSubtask(st.id)}
                  style={{
                    ...styles.subtaskCard,
                    ...(st.completed ? styles.subtaskCardChecked : {}),
                  }}
                >
                  <div style={styles.checkboxWrapper}>
                    <div
                      style={{
                        ...styles.checkbox,
                        ...(st.completed ? styles.checkboxChecked : {}),
                      }}
                    >
                      {st.completed && <span style={styles.checkMark}>✓</span>}
                    </div>
                  </div>
                  <span
                    style={{
                      ...styles.subtaskText,
                      ...(st.completed ? styles.subtaskTextChecked : {}),
                    }}
                  >
                    {st.text}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubtask(st.id);
                    }}
                    style={styles.deleteSubtaskBtn}
                    title="Xóa việc con này"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>

            {/* Inline add subtask form */}
            {isAdding && (
              <div style={styles.addInlineBox}>
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  placeholder="Nhập tên đầu việc con mới..."
                  style={styles.addInlineInput}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubtask(e);
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                />
                <div style={styles.addInlineActions}>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    style={styles.inlineCancelBtn}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    style={styles.inlineSaveBtn}
                  >
                    Thêm
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Trường trạng thái */}
          <div style={styles.section}>
            <label htmlFor="task-status-dropdown" style={styles.fieldLabel}>
              Trạng thái:
            </label>
            <div style={styles.statusSelectWrapper}>
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor:
                    status === 'done'
                      ? '#2563EB'
                      : status === 'doing'
                      ? '#2563EB'
                      : status === 'review'
                      ? '#F59E0B'
                      : '#94A3B8',
                }}
              />
              <select
                id="task-status-dropdown"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={styles.statusSelect}
              >
                <option value="doing">Đang làm việc</option>
                <option value="review">Chờ nghiệm thu (Review)</option>
                <option value="done">Đã hoàn thành</option>
                <option value="todo">Chưa bắt đầu</option>
              </select>
              <div style={styles.selectArrow}>▼</div>
            </div>
          </div>

          {/* 4. Trường đường dẫn Pull Request / Minh chứng */}
          <div style={styles.section}>
            <div style={styles.noteHeaderRow}>
              <label htmlFor="task-pr-link-input" style={styles.fieldLabel}>
                Liên kết Pull Request (PR) / Minh chứng:
              </label>
              <button
                type="button"
                onClick={() => {
                  const sample = 'https://github.com/ictu-interns/core-api/pull/102';
                  setPrLink(sample);
                }}
                style={styles.prShortcutBtn}
                title="Điền đường dẫn Pull Request mẫu"
              >
                Điền link mẫu
              </button>
            </div>
            <div style={styles.inputWrapper}>
              <input
                id="task-pr-link-input"
                type="url"
                value={prLink}
                onChange={(e) => setPrLink(e.target.value)}
                placeholder="https://github.com/ictu-interns/core-api/pull/102 (Dán link PR hoặc commit tại đây)"
                style={styles.textInput}
              />
            </div>
          </div>

          {/* 5. Khu vực bàn giao & ghi chú kết quả */}
          <div style={styles.section}>
            <div style={styles.noteHeaderRow}>
              <label htmlFor="task-note-box" style={styles.fieldLabel}>
                Ghi chú kết quả & bàn giao:
              </label>
              <button
                type="button"
                onClick={() => setShowAttachInput(!showAttachInput)}
                style={styles.prShortcutBtn}
                title="Gắn liên kết Pull Request vào nội dung ghi chú"
              >
                {showAttachInput ? 'Đóng gắn link' : 'Gắn link PR'}
              </button>
            </div>

            {/* Inline attach link box */}
            {showAttachInput && (
              <div style={styles.attachInlineBox}>
                <input
                  type="text"
                  placeholder="Dán link PR (VD: https://github.com/...)"
                  value={attachUrl}
                  onChange={(e) => setAttachUrl(e.target.value)}
                  style={styles.attachInlineInput}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyAttachLink();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleApplyAttachLink}
                  style={styles.inlineSaveBtn}
                >
                  Chèn link
                </button>
                <button
                  type="button"
                  onClick={() => setShowAttachInput(false)}
                  style={styles.inlineCancelBtn}
                >
                  Hủy
                </button>
              </div>
            )}

            <div style={styles.textareaWrapper}>
              <textarea
                id="task-note-box"
                ref={textareaRef}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú chi tiết mã commit, kết quả bàn giao hoặc khó khăn gặp phải..."
                style={styles.textarea}
              />
              <div style={styles.charCountBox}>
                <span>{note.length} ký tự</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.ghostBtn}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={styles.primaryBtn}
            >
              Lưu cập nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    animation: 'fadeIn 0.18s ease-out',
  },
  modal: {
    width: '100%',
    maxWidth: '560px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    border: '1px solid #E2E8F0',
    fontFamily: 'var(--fb-font)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '92vh',
  },
  header: {
    padding: '16px 22px',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'var(--fb-font)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    fontWeight: '600',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    lineHeight: 1,
    transition: 'all 0.15s ease',
  },
  taskBanner: {
    backgroundColor: '#F8FAFC',
    padding: '12px 22px',
    borderBottom: '1px solid #E2E8F0',
  },
  taskLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  taskTitleRow: {
    margin: '3px 0 8px',
  },
  taskTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: '1.4',
    fontFamily: 'var(--fb-font)',
  },
  tagGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  tagBlue: {
    fontSize: '11.5px',
    fontWeight: '600',
    padding: '2px 8px',
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    borderRadius: '4px',
    border: '1px solid #DBEAFE',
  },
  tagPurple: {
    fontSize: '11.5px',
    fontWeight: '600',
    padding: '2px 8px',
    backgroundColor: '#F5F3FF',
    color: '#7C3AED',
    borderRadius: '4px',
    border: '1px solid #EDE9FE',
  },
  tagGray: {
    fontSize: '11.5px',
    fontWeight: '500',
    padding: '2px 8px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    borderRadius: '4px',
  },
  body: {
    padding: '18px 22px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    margin: 0,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  progressTitleGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  progressLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  progressValue: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#2563EB',
  },
  progressBadge: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748B',
  },
  progressBarTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: '#E2E8F0',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '9999px',
    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease',
  },
  subtasksHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  addSubtaskBtn: {
    background: 'none',
    border: 'none',
    color: '#2563EB',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  subtaskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  subtaskCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  subtaskCardChecked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  checkboxWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    borderRadius: '5px',
    border: '1.8px solid #94A3B8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.15s ease',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  subtaskText: {
    flex: 1,
    fontSize: '13px',
    color: '#1E293B',
    lineHeight: '1.4',
    transition: 'color 0.15s ease',
  },
  subtaskTextChecked: {
    color: '#64748B',
    textDecoration: 'line-through',
  },
  deleteSubtaskBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '3px 7px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  addInlineBox: {
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  addInlineInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1.5px solid #2563EB',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'var(--fb-font)',
  },
  addInlineActions: {
    display: 'flex',
    gap: '6px',
  },
  inlineCancelBtn: {
    padding: '7px 12px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  inlineSaveBtn: {
    padding: '7px 14px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statusSelectWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    left: '14px',
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 1,
  },
  statusSelect: {
    width: '100%',
    padding: '9px 36px 9px 32px',
    fontSize: '13.5px',
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--fb-font)',
  },
  selectArrow: {
    position: 'absolute',
    right: '14px',
    pointerEvents: 'none',
    fontSize: '10px',
    color: '#64748B',
  },
  noteHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prShortcutBtn: {
    background: 'none',
    border: 'none',
    color: '#2563EB',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  inputWrapper: {
    position: 'relative',
  },
  textInput: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '13px',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'var(--fb-font)',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  attachInlineBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    border: '1px solid #BFDBFE',
    marginBottom: '6px',
  },
  attachInlineInput: {
    flex: 1,
    padding: '7px 10px',
    border: '1px solid #93C5FD',
    borderRadius: '6px',
    fontSize: '12.5px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    fontFamily: 'var(--fb-font)',
  },
  textareaWrapper: {
    position: 'relative',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px 28px 12px',
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#0F172A',
    resize: 'vertical',
    minHeight: '75px',
    fontFamily: 'var(--fb-font)',
    boxSizing: 'border-box',
  },
  charCountBox: {
    position: 'absolute',
    right: '10px',
    bottom: '6px',
    fontSize: '11px',
    color: '#94A3B8',
    pointerEvents: 'none',
  },
  footer: {
    paddingTop: '12px',
    borderTop: '1px solid #F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  ghostBtn: {
    padding: '9px 18px',
    backgroundColor: '#F8FAFC',
    color: '#475569',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--fb-font)',
  },
  primaryBtn: {
    padding: '9px 20px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--fb-font)',
  },
};

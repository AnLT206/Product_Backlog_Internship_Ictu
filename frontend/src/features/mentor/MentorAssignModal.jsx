import MentorAssignmentView from './MentorAssignmentView';
import './MentorAssignModal.css';

/**
 * MentorAssignModal
 * Popup phân bổ thực tập sinh cho mentor (kế thừa MentorAssignmentView).
 *
 * @param {object} props
 * @param {object} props.mentor
 * @param {function} props.onClose
 * @param {function} [props.onSuccess]
 * @param {function} [props.onToast]
 */
export default function MentorAssignModal({ mentor, onClose, onSuccess, onToast }) {
  return (
    <div className="mentor-assign-overlay" onClick={onClose}>
      <div className="mentor-assign-modal" onClick={(e) => e.stopPropagation()}>
        <MentorAssignmentView
          initialMentorId={mentor?.id}
          isModalMode={true}
          onClose={onClose}
          onAssignmentSuccess={(data, count) => {
            if (onSuccess) {
              onSuccess({ ...mentor, intern_count: count });
            }
            if (onToast) {
              onToast({
                type: 'success',
                message: `Đã phân bổ thành công! Mentor ${mentor?.full_name || ''} hiện phụ trách ${count} TTS.`,
              });
            }
          }}
        />
      </div>
    </div>
  );
}

import Modal from '../Modal'
import Avatar from '../Avatar'
import Icon from '../Icon'
import { getScopeMeta } from '../../data/calendarMeta'
import { formatShortDate, formatTimeRange } from '../../utils/calendarUtils'

/** Chi tiết sự kiện — sửa/xóa chỉ hiện với người có quyền (chủ sự kiện hoặc admin trên sự kiện chung). */
export default function EventDetailModal({ event, open, onClose, onEdit, onRequestDelete, canManage = false }) {
  if (!event) return null

  const scope = getScopeMeta(event.scope)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={event.title}
      description={`${formatShortDate(event.date)} · ${formatTimeRange(event.startTime, event.endTime)}`}
      footer={
        canManage ? (
          <>
            <button
              type="button"
              className="btn btn-danger-ghost event-detail-delete"
              onClick={onRequestDelete}
            >
              <Icon name="error" size={16} />
              Xóa sự kiện
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
            <button type="button" className="btn btn-primary" onClick={onEdit}>
              Sửa sự kiện
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        )
      }
    >
      <div className="event-detail">
        <span className={`badge badge-${scope.tone}`}>{scope.label}</span>

        <div className="event-detail-row">
          <Icon name="clock" size={16} />
          <span>{formatTimeRange(event.startTime, event.endTime)}</span>
        </div>

        {event.location && (
          <div className="event-detail-row">
            <Icon name="mapPin" size={16} />
            <span>{event.location}</span>
          </div>
        )}

        <div className="event-detail-row">
          <Icon name="employees" size={16} />
          <span>Người tạo: {event.ownerName || 'Không rõ'}</span>
        </div>

        {event.description && (
          <div className="event-detail-description">
            <p className="field-label">Mô tả</p>
            <p>{event.description}</p>
          </div>
        )}

        {event.participants?.length > 0 && (
          <div className="event-detail-participants">
            <p className="field-label">Người tham gia ({event.participants.length})</p>
            <ul>
              {event.participants.map((person) => (
                <li key={person.id}>
                  <Avatar name={person.name} photoURL={person.photoURL} initials={person.initials} size="sm" />
                  <span>{person.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}

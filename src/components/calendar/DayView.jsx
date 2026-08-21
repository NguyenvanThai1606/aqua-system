import Icon from '../Icon'
import { getScopeMeta } from '../../data/calendarMeta'
import { eventsForDate, formatTimeRange, toISODate } from '../../utils/calendarUtils'

export default function DayView({ cursor, events, onOpenEvent }) {
  const iso = toISODate(cursor)
  const dayEvents = eventsForDate(events, iso)

  if (dayEvents.length === 0) {
    return <p className="calendar-day-empty muted">Không có sự kiện nào trong ngày này.</p>
  }

  return (
    <ul className="calendar-day-list">
      {dayEvents.map((event) => {
        const scope = getScopeMeta(event.scope)
        return (
          <li key={event.id}>
            <button
              type="button"
              className={`calendar-day-item calendar-day-item-${scope.tone}`}
              onClick={() => onOpenEvent(event)}
            >
              <span className="calendar-day-item-time">{formatTimeRange(event.startTime, event.endTime)}</span>
              <span className="calendar-day-item-main">
                <span className="calendar-day-item-title">{event.title}</span>
                {event.location && (
                  <span className="calendar-day-item-location">
                    <Icon name="mapPin" size={13} />
                    {event.location}
                  </span>
                )}
              </span>
              <span className={`badge badge-${scope.tone}`}>{scope.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

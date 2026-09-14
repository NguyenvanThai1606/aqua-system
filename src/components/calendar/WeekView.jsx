import { WEEKDAY_LABELS_SHORT, getScopeMeta } from '../../data/calendarMeta'
import {
  eventsForDate,
  formatTimeRange,
  getWeekDays,
  isToday,
  toISODate,
} from '../../utils/calendarUtils'
import cx from '../../utils/cx'

export default function WeekView({ cursor, events, onSelectDay, onOpenEvent }) {
  const days = getWeekDays(cursor)

  return (
    <div className="calendar-week">
      {days.map((day, index) => {
        const iso = toISODate(day)
        const dayEvents = eventsForDate(events, iso)

        return (
          <div key={iso} className={cx('calendar-week-col', isToday(day) && 'calendar-week-col-today')}>
            <button type="button" className="calendar-week-head" onClick={() => onSelectDay(day)}>
              <span className="calendar-week-head-label">{WEEKDAY_LABELS_SHORT[index]}</span>
              <span className="calendar-week-head-num">{day.getDate()}</span>
            </button>

            <div className="calendar-week-events">
              {dayEvents.length === 0 && <p className="calendar-week-empty muted">Không có sự kiện</p>}
              {dayEvents.map((event) => {
                const scope = getScopeMeta(event.scope)
                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`calendar-event-card calendar-event-card-${scope.tone}`}
                    onClick={() => onOpenEvent(event)}
                  >
                    <span className="calendar-event-card-time">
                      {formatTimeRange(event.startTime, event.endTime)}
                    </span>
                    <span className="calendar-event-card-title">{event.title}</span>
                    {event.location && (
                      <span className="calendar-event-card-location">{event.location}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

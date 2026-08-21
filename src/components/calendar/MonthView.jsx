import { WEEKDAY_LABELS_SHORT, getScopeMeta } from '../../data/calendarMeta'
import { eventsForDate, getMonthMatrix } from '../../utils/calendarUtils'
import cx from '../../utils/cx'

const MAX_VISIBLE_PER_DAY = 3

export default function MonthView({ cursor, events, onSelectDay, onOpenEvent }) {
  const weeks = getMonthMatrix(cursor)

  return (
    <div className="calendar-month">
      <div className="calendar-month-headrow">
        {WEEKDAY_LABELS_SHORT.map((label) => (
          <div key={label} className="calendar-month-headcell">
            {label}
          </div>
        ))}
      </div>

      <div className="calendar-month-grid">
        {weeks.flat().map((cell) => {
          const dayEvents = eventsForDate(events, cell.iso)
          const visible = dayEvents.slice(0, MAX_VISIBLE_PER_DAY)
          const hiddenCount = dayEvents.length - visible.length

          return (
            <div
              key={cell.iso}
              className={cx(
                'calendar-month-cell',
                !cell.inCurrentMonth && 'calendar-month-cell-muted',
                cell.isToday && 'calendar-month-cell-today',
              )}
            >
              <button
                type="button"
                className="calendar-month-daynum"
                onClick={() => onSelectDay(cell.date)}
              >
                {cell.date.getDate()}
              </button>

              <div className="calendar-month-events">
                {visible.map((event) => {
                  const scope = getScopeMeta(event.scope)
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={`calendar-event-chip calendar-event-chip-${scope.tone}`}
                      onClick={() => onOpenEvent(event)}
                      title={event.title}
                    >
                      {event.startTime && <span className="calendar-event-chip-time">{event.startTime}</span>}
                      <span className="calendar-event-chip-title">{event.title}</span>
                    </button>
                  )
                })}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    className="calendar-event-more"
                    onClick={() => onSelectDay(cell.date)}
                  >
                    +{hiddenCount} sự kiện khác
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

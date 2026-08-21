import Icon from '../Icon'
import { CALENDAR_VIEWS } from '../../data/calendarMeta'
import { formatDayTitle, formatMonthTitle, formatWeekTitle } from '../../utils/calendarUtils'

function titleFor(view, cursor) {
  if (view === 'week') return formatWeekTitle(cursor)
  if (view === 'day') return formatDayTitle(cursor)
  return formatMonthTitle(cursor)
}

export default function CalendarToolbar({ view, onViewChange, cursor, onPrev, onNext, onToday }) {
  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-nav">
        <button type="button" className="icon-btn" onClick={onPrev} aria-label="Kỳ trước">
          <Icon name="chevronLeft" size={18} />
        </button>
        <button type="button" className="btn btn-secondary calendar-today-btn" onClick={onToday}>
          Hôm nay
        </button>
        <button type="button" className="icon-btn" onClick={onNext} aria-label="Kỳ sau">
          <Icon name="chevronRight" size={18} />
        </button>
        <h2 className="calendar-toolbar-title">{titleFor(view, cursor)}</h2>
      </div>

      <div className="calendar-view-switch" role="tablist" aria-label="Chế độ xem lịch">
        {CALENDAR_VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            className={view === item.id ? 'calendar-view-btn calendar-view-btn-active' : 'calendar-view-btn'}
            onClick={() => onViewChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

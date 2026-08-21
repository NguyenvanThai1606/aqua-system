import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Icon from '../components/Icon'
import ConfirmDialog from '../components/ConfirmDialog'
import CalendarToolbar from '../components/calendar/CalendarToolbar'
import MonthView from '../components/calendar/MonthView'
import WeekView from '../components/calendar/WeekView'
import DayView from '../components/calendar/DayView'
import EventFormModal from '../components/calendar/EventFormModal'
import EventDetailModal from '../components/calendar/EventDetailModal'
import { useEvents } from '../utils/eventsContext'
import { useAuth } from '../utils/authContext'
import { useToast } from '../utils/toastContext'
import { resolveDisplayName } from '../services/userService'
import { addDays, addMonths, toISODate } from '../utils/calendarUtils'
import { DEFAULT_VIEW } from '../data/calendarMeta'
import '../styles/calendar.css'

/** Sự kiện mà user hiện tại được phép sửa/xóa — chủ sự kiện cá nhân, hoặc admin trên sự kiện chung. */
function canManageEvent(event, user, isAdmin) {
  if (!event || !user) return false
  if (event.scope === 'company') return isAdmin
  return event.ownerId === user.uid
}

export default function CalendarPage() {
  const { events, loading, addEvent, patchEvent, removeEvent } = useEvents()
  const { user, isAdmin } = useAuth()
  const toast = useToast()

  const [view, setView] = useState(DEFAULT_VIEW)
  const [cursor, setCursor] = useState(() => new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [formDefaultDate, setFormDefaultDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedEvent = events.find((event) => event.id === selectedId) ?? null

  const step = useMemo(() => {
    if (view === 'month') return (date, dir) => addMonths(date, dir)
    if (view === 'week') return (date, dir) => addDays(date, dir * 7)
    return (date, dir) => addDays(date, dir)
  }, [view])

  const openCreateForm = (date) => {
    setEditingEvent(null)
    setFormDefaultDate(date ? toISODate(date) : toISODate(cursor))
    setFormOpen(true)
  }

  const openEditForm = () => {
    setEditingEvent(selectedEvent)
    setSelectedId(null)
    setFormOpen(true)
  }

  const handleSubmit = async (input) => {
    const ownerName = user ? resolveDisplayName(user) : ''

    if (editingEvent) {
      await patchEvent(editingEvent.id, input)
      toast.success('Đã cập nhật sự kiện', { message: input.title })
    } else {
      await addEvent({ ...input, ownerId: user?.uid, ownerName })
      toast.success('Đã tạo sự kiện', { message: input.title })
    }
    setFormOpen(false)
    setEditingEvent(null)
  }

  const handleDelete = async () => {
    if (!selectedEvent) return
    const { title } = selectedEvent
    setDeleting(true)
    try {
      await removeEvent(selectedEvent.id)
      setConfirmOpen(false)
      setSelectedId(null)
      toast.success('Đã xóa sự kiện', { message: title })
    } catch (error) {
      toast.error('Không thể xóa sự kiện', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        icon="calendar"
        title="Lịch"
        description="Lịch họp, sự kiện và thời hạn công việc của cả công ty."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openCreateForm(cursor)}>
            <Icon name="plus" size={16} />
            Tạo sự kiện
          </button>
        }
      />

      <Card className="calendar-card">
        <CalendarToolbar
          view={view}
          onViewChange={setView}
          cursor={cursor}
          onPrev={() => setCursor((current) => step(current, -1))}
          onNext={() => setCursor((current) => step(current, 1))}
          onToday={() => setCursor(new Date())}
        />

        {loading ? (
          <p className="calendar-state muted">Đang tải lịch…</p>
        ) : (
          <>
            {view === 'month' && (
              <MonthView
                cursor={cursor}
                events={events}
                onSelectDay={(date) => {
                  setCursor(date)
                  setView('day')
                }}
                onOpenEvent={(event) => setSelectedId(event.id)}
              />
            )}
            {view === 'week' && (
              <WeekView
                cursor={cursor}
                events={events}
                onSelectDay={(date) => {
                  setCursor(date)
                  setView('day')
                }}
                onOpenEvent={(event) => setSelectedId(event.id)}
              />
            )}
            {view === 'day' && (
              <DayView cursor={cursor} events={events} onOpenEvent={(event) => setSelectedId(event.id)} />
            )}
          </>
        )}
      </Card>

      <EventFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingEvent(null)
        }}
        onSubmit={handleSubmit}
        event={editingEvent}
        defaultDate={formDefaultDate}
        canManageCompanyScope={isAdmin}
      />

      <EventDetailModal
        event={selectedEvent}
        open={Boolean(selectedEvent) && !confirmOpen && !formOpen}
        onClose={() => setSelectedId(null)}
        onEdit={openEditForm}
        onRequestDelete={() => setConfirmOpen(true)}
        canManage={canManageEvent(selectedEvent, user, isAdmin)}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        busy={deleting}
        title="Xóa sự kiện?"
        description={
          selectedEvent
            ? `“${selectedEvent.title}” sẽ bị xóa khỏi lịch. Thao tác này không hoàn tác được.`
            : undefined
        }
        confirmLabel="Xóa"
      />
    </>
  )
}

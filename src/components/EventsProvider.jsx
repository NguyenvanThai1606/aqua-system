import { useCallback, useEffect, useMemo, useState } from 'react'
import { EventsContext } from '../utils/eventsContext'
import { useAuth } from '../utils/authContext'
import { useNotifications } from '../utils/notificationsContext'
import * as eventService from '../services/eventService'

/**
 * Kho sự kiện lịch dùng chung cho trang /lich VÀ trang /cham-cong — Chấm
 * công cần đọc sự kiện của ngày đang chấm công để xác định khung giờ làm
 * việc (xem `utils/attendanceUtils.js#getWorkScheduleForDate`), nên đặt
 * Provider này ở App.jsx ngang hàng với TasksProvider/ProjectsProvider
 * thay vì chỉ local state riêng của CalendarPage.
 *
 * [Phase 15] Sau khi tạo/sửa/xóa sự kiện thành công, tự phát thông báo cho
 * người tham gia (`event.participants`, trừ chính chủ sự kiện) — CÙNG
 * pattern `notify()` không throw đã dùng ở `TasksProvider`/`ProjectsProvider`
 * (xem đó để biết lý do không chặn thao tác chính nếu gửi thông báo lỗi):
 *  - Tạo sự kiện có người tham gia → `event_invited` cho từng người mới.
 *  - Sửa sự kiện → người tham gia CŨ (còn ở lại) nhận `event_updated`;
 *    người MỚI được thêm vào nhận `event_invited` (đúng yêu cầu "khi user
 *    được thêm vào một event, user đó nhận notification" — không lẫn với
 *    "sự kiện vừa sửa" vì với họ đây là lời mời, không phải cập nhật).
 *  - Xóa sự kiện → mọi người tham gia nhận `event_cancelled`. Phải gửi
 *    thông báo TRƯỚC khi gọi `eventService.deleteEvent()` — rule Firestore
 *    cho phép tạo notification loại lịch dựa vào việc `get()` xác nhận
 *    người gọi là chủ sự kiện ĐANG TỒN TẠI (xem `firestore.rules`); sau khi
 *    xóa, `get()` đó sẽ thất bại.
 */
export default function EventsProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { notify } = useNotifications()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    if (authLoading) {
      setEvents([])
      setLoading(true)
      return () => {
        active = false
      }
    }

    if (!user) {
      setEvents([])
      setLoading(false)
      return () => {
        active = false
      }
    }

    setLoading(true)

    eventService
      .listEvents()
      .then((data) => {
        if (active) setEvents(data)
      })
      .catch((error) => {
        console.error('[EventsProvider] Không tải được sự kiện lịch:', error)
        if (active) setEvents([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authLoading, user])

  const notifyParticipants = useCallback(
    (event, participants, { type, title }) => {
      if (!user) return
      participants
        .filter((person) => person.id && person.id !== user.uid)
        .forEach((person) => {
          notify({
            userId: person.id,
            type,
            title,
            message: event.title,
            relatedType: 'event',
            relatedId: event.id,
            actorId: user.uid,
            actorName: user.displayName || user.email || null,
          }).catch((error) => console.error('[EventsProvider] Không gửi được thông báo lịch:', error))
        })
    },
    [user, notify],
  )

  const addEvent = useCallback(
    async (input) => {
      const created = await eventService.createEvent(input)
      setEvents((current) => [created, ...current])
      notifyParticipants(created, created.participants ?? [], {
        type: 'event_invited',
        title: 'Bạn được mời tham gia một sự kiện',
      })
      return created
    },
    [notifyParticipants],
  )

  const patchEvent = useCallback(
    async (id, patch) => {
      const previous = events.find((event) => event.id === id) ?? null
      const updated = await eventService.updateEvent(id, patch)
      setEvents((current) => current.map((event) => (event.id === id ? updated : event)))

      const previousIds = new Set((previous?.participants ?? []).map((person) => person.id))
      const nextParticipants = updated.participants ?? []
      const newlyAdded = nextParticipants.filter((person) => !previousIds.has(person.id))
      const stillPresent = nextParticipants.filter((person) => previousIds.has(person.id))

      notifyParticipants(updated, newlyAdded, {
        type: 'event_invited',
        title: 'Bạn được mời tham gia một sự kiện',
      })
      notifyParticipants(updated, stillPresent, {
        type: 'event_updated',
        title: 'Sự kiện của bạn vừa được cập nhật',
      })

      return updated
    },
    [events, notifyParticipants],
  )

  const removeEvent = useCallback(
    async (id) => {
      const target = events.find((event) => event.id === id) ?? null
      if (target) {
        notifyParticipants(target, target.participants ?? [], {
          type: 'event_cancelled',
          title: 'Một sự kiện bạn tham gia đã bị hủy',
        })
      }
      await eventService.deleteEvent(id)
      setEvents((current) => current.filter((event) => event.id !== id))
      return id
    },
    [events, notifyParticipants],
  )

  const value = useMemo(
    () => ({ events, loading, addEvent, patchEvent, removeEvent }),
    [events, loading, addEvent, patchEvent, removeEvent],
  )

  return <EventsContext value={value}>{children}</EventsContext>
}

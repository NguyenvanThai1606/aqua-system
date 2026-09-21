import { useCallback, useEffect, useMemo, useState } from 'react'
import { TasksContext } from '../utils/tasksContext'
import { countOverdue } from '../utils/taskUtils'
import { useAuth } from '../utils/authContext'
import { useNotifications } from '../utils/notificationsContext'
import * as taskService from '../services/taskService'

/**
 * Kho công việc dùng chung cho cả trang /cong-viec và badge quá hạn ở sidebar.
 * Mọi thao tác đi qua `taskService` nên sau này đổi sang Firestore
 * không phải sửa component nào.
 *
 * [Phase 14] Sau khi tạo/sửa xong (dữ liệu đã lưu thành công), tự phát
 * thông báo cho assignee nếu:
 *  - `assignee` VỪA được gán/đổi sang một người KHÁC người đang thao tác
 *    (`task_assigned` — "bạn được giao việc mới").
 *  - assignee KHÔNG đổi nhưng title/description/deadline thay đổi, và
 *    người sửa KHÔNG PHẢI chính assignee đó (`task_updated` — chỉ có thể
 *    là admin sửa, vì rule `tasks` khóa các field này với user thường tự
 *    sửa task của mình — xem `firestore.rules`).
 * KHÔNG throw nếu gửi thông báo lỗi — thao tác chính (lưu task) đã thành
 * công rồi, thông báo chỉ là phụ trợ.
 */
export default function TasksProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { notify } = useNotifications()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    if (authLoading) {
      setTasks([])
      setLoading(true)
      return () => {
        active = false
      }
    }

    if (!user) {
      setTasks([])
      setLoading(false)
      return () => {
        active = false
      }
    }

    setLoading(true)

    taskService
      .listTasks()
      .then((data) => {
        if (active) setTasks(data)
      })
      .catch((error) => {
        console.error('[TasksProvider] Không tải được công việc:', error)
        if (active) setTasks([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authLoading, user])

  const notifyTaskAssigned = useCallback(
    (task) => {
      if (!user || !task.assignee?.id || task.assignee.id === user.uid) return
      notify({
        userId: task.assignee.id,
        type: 'task_assigned',
        title: 'Bạn được giao một công việc mới',
        message: task.description || task.title,
        relatedType: 'task',
        relatedId: task.id,
        actorId: user.uid,
        actorName: user.displayName || user.email || null,
      }).catch((error) => console.error('[TasksProvider] Không gửi được thông báo giao việc:', error))
    },
    [user, notify],
  )

  const notifyTaskUpdated = useCallback(
    (task) => {
      if (!user || !task.assignee?.id || task.assignee.id === user.uid) return
      notify({
        userId: task.assignee.id,
        type: 'task_updated',
        title: 'Công việc của bạn vừa được cập nhật',
        message: task.description || task.title,
        relatedType: 'task',
        relatedId: task.id,
        actorId: user.uid,
        actorName: user.displayName || user.email || null,
      }).catch((error) => console.error('[TasksProvider] Không gửi được thông báo cập nhật việc:', error))
    },
    [user, notify],
  )

  const addTask = useCallback(
    async (input) => {
      const created = await taskService.createTask(input)
      setTasks((current) => [created, ...current])
      notifyTaskAssigned(created)
      return created
    },
    [notifyTaskAssigned],
  )

  const patchTask = useCallback(
    async (id, patch) => {
      const before = tasks.find((task) => task.id === id)
      const updated = await taskService.updateTask(id, patch)
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)))

      const assigneeChanged = before?.assignee?.id !== updated.assignee?.id
      if (assigneeChanged) {
        notifyTaskAssigned(updated)
      } else if (
        before &&
        (before.title !== updated.title ||
          before.description !== updated.description ||
          before.deadline !== updated.deadline)
      ) {
        notifyTaskUpdated(updated)
      }

      return updated
    },
    [tasks, notifyTaskAssigned, notifyTaskUpdated],
  )

  const removeTask = useCallback(async (id) => {
    await taskService.deleteTask(id)
    setTasks((current) => current.filter((task) => task.id !== id))
    return id
  }, [])

  /** Tick/bỏ tick một dòng checklist rồi lưu lại cả mảng. */
  const toggleChecklistItem = useCallback(
    (taskId, itemId) => {
      const task = tasks.find((item) => item.id === taskId)
      if (!task) return Promise.resolve(null)

      const checklist = task.checklist.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item,
      )
      return patchTask(taskId, { checklist })
    },
    [tasks, patchTask],
  )

  const overdueCount = useMemo(() => countOverdue(tasks), [tasks])

  const value = useMemo(
    () => ({
      tasks,
      loading,
      overdueCount,
      addTask,
      patchTask,
      removeTask,
      toggleChecklistItem,
    }),
    [tasks, loading, overdueCount, addTask, patchTask, removeTask, toggleChecklistItem],
  )

  return <TasksContext value={value}>{children}</TasksContext>
}

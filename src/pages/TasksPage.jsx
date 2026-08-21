import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import ConfirmDialog from '../components/ConfirmDialog'
import TaskBoard from '../components/tasks/TaskBoard'
import TaskFilters from '../components/tasks/TaskFilters'
import TaskDetailModal from '../components/tasks/TaskDetailModal'
import TaskFormModal from '../components/tasks/TaskFormModal'
import useTaskFilters from '../utils/useTaskFilters'
import { useTasks } from '../utils/tasksContext'
import { useToast } from '../utils/toastContext'
import { useAuth } from '../utils/authContext'
import '../styles/tasks.css'

export default function TasksPage() {
  const { tasks, loading, overdueCount, addTask, patchTask, removeTask, toggleChecklistItem } =
    useTasks()
  const toast = useToast()
  const { isAdmin } = useAuth()

  const { filters, setFilters, visibleTasks, isFiltering, resetFilters } = useTaskFilters(tasks)

  const [selectedId, setSelectedId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Đọc lại từ `tasks` để modal luôn hiển thị dữ liệu mới nhất sau khi sửa.
  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null

  const handleCreate = async (input) => {
    await addTask(input)
    setFormOpen(false)
    toast.success('Đã tạo công việc', { message: input.title })
  }

  const handleDelete = async () => {
    if (!selectedTask) return

    const { title } = selectedTask
    setDeleting(true)
    try {
      await removeTask(selectedTask.id)
      setConfirmOpen(false)
      setSelectedId(null)
      toast.success('Đã xóa công việc', { message: title })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        icon="tasks"
        title="Công việc"
        description="Giao việc, theo dõi tiến độ và thời hạn của từng đầu việc."
        actions={
          isAdmin && (
            <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
              <Icon name="plus" size={16} />
              Tạo công việc
            </button>
          )
        }
      />

      <div className="task-page">
        <TaskFilters filters={filters} onChange={setFilters} />

        <p className="task-summary">
          Hiển thị <strong>{visibleTasks.length}</strong> / {tasks.length} công việc
          {overdueCount > 0 && (
            <>
              {' · '}
              <span className="task-summary-overdue">{overdueCount} việc quá hạn</span>
            </>
          )}
          {isFiltering && (
            <button type="button" className="task-summary-reset" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          )}
        </p>

        {loading ? (
          <p className="task-state muted">Đang tải công việc…</p>
        ) : visibleTasks.length === 0 ? (
          <p className="task-state muted">
            {isFiltering
              ? 'Không có công việc nào khớp với bộ lọc hiện tại.'
              : 'Chưa có công việc nào. Bấm “Tạo công việc” để bắt đầu.'}
          </p>
        ) : (
          <TaskBoard tasks={visibleTasks} onOpenTask={(task) => setSelectedId(task.id)} />
        )}
      </div>

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      <TaskDetailModal
        task={selectedTask}
        open={Boolean(selectedTask) && !confirmOpen}
        onClose={() => setSelectedId(null)}
        onPatch={(patch) => patchTask(selectedTask.id, patch)}
        onToggleChecklistItem={(itemId) => toggleChecklistItem(selectedTask.id, itemId)}
        onRequestDelete={() => setConfirmOpen(true)}
        canDelete={isAdmin}
        canReassign={isAdmin}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        busy={deleting}
        title="Xóa công việc?"
        description={
          selectedTask
            ? `“${selectedTask.title}” sẽ bị xóa khỏi bảng. Thao tác này không hoàn tác được.`
            : undefined
        }
        confirmLabel="Xóa"
      />
    </>
  )
}

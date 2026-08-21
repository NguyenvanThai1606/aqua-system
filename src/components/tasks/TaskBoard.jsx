import TaskColumn from './TaskColumn'
import { TASK_STATUSES } from '../../data/taskMeta'
import { groupByStatus } from '../../utils/taskUtils'

/** Bảng Kanban 4 cột theo trạng thái. */
export default function TaskBoard({ tasks, onOpenTask }) {
  const columns = groupByStatus(tasks, TASK_STATUSES)

  return (
    <div className="task-board">
      {columns.map((column) => (
        <TaskColumn
          key={column.status.id}
          status={column.status}
          tasks={column.tasks}
          onOpenTask={onOpenTask}
        />
      ))}
    </div>
  )
}

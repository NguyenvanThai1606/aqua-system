import TaskCard from './TaskCard'

/** Một cột trạng thái trên bảng Kanban. */
export default function TaskColumn({ status, tasks, onOpenTask }) {
  return (
    <section className="task-column" aria-label={status.label}>
      <header className="task-column-header">
        <span className={`task-column-dot task-column-dot-${status.tone}`} aria-hidden="true" />
        <h2 className="task-column-title">{status.label}</h2>
        <span className="task-column-count">{tasks.length}</span>
      </header>

      <div className="task-column-body">
        {tasks.length === 0 ? (
          <p className="task-column-empty">Không có công việc</p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpenTask} />)
        )}
      </div>
    </section>
  )
}

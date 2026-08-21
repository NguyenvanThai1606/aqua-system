import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import ConfirmDialog from '../components/ConfirmDialog'
import ProjectList from '../components/projects/ProjectList'
import ProjectFilters from '../components/projects/ProjectFilters'
import ProjectDetailModal from '../components/projects/ProjectDetailModal'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import useProjectFilters from '../utils/useProjectFilters'
import { useProjects } from '../utils/projectsContext'
import { useToast } from '../utils/toastContext'
import { useAuth } from '../utils/authContext'
import '../styles/projects.css'

export default function ProjectsPage() {
  const { projects, loading, overdueCount, addProject, patchProject, removeProject } =
    useProjects()
  const toast = useToast()
  const { isAdmin } = useAuth()

  const { filters, setFilters, visibleProjects, isFiltering, resetFilters } =
    useProjectFilters(projects)

  const [selectedId, setSelectedId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedProject = projects.find((project) => project.id === selectedId) ?? null

  const handleCreate = async (input) => {
    try {
      await addProject(input)
      setFormOpen(false)
      toast.success('Đã tạo dự án', { message: input.name })
    } catch (error) {
      toast.error('Không thể tạo dự án', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    }
  }

  const handlePatch = async (patch) => {
    if (!selectedProject) return

    try {
      await patchProject(selectedProject.id, patch)
    } catch (error) {
      toast.error('Không thể cập nhật dự án', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedProject) return

    const { name } = selectedProject
    setDeleting(true)
    try {
      await removeProject(selectedProject.id)
      setConfirmOpen(false)
      setSelectedId(null)
      toast.success('Đã xóa dự án', { message: name })
    } catch (error) {
      toast.error('Không thể xóa dự án', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        icon="projects"
        title="Dự án"
        description="Theo dõi tiến độ, ngân sách và nhân sự của từng dự án."
        actions={
          isAdmin && (
            <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
              <Icon name="plus" size={16} />
              Tạo dự án
            </button>
          )
        }
      />

      <div className="project-page">
        <ProjectFilters filters={filters} onChange={setFilters} projects={projects} />

        <p className="project-summary">
          Hiển thị <strong>{visibleProjects.length}</strong> / {projects.length} dự án
          {overdueCount > 0 && (
            <>
              {' · '}
              <span className="project-summary-overdue">{overdueCount} dự án quá hạn</span>
            </>
          )}
          {isFiltering && (
            <button type="button" className="project-summary-reset" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          )}
        </p>

        {loading ? (
          <p className="project-state muted">Đang tải dự án…</p>
        ) : visibleProjects.length === 0 ? (
          <p className="project-state muted">
            {isFiltering
              ? 'Không có dự án nào khớp với bộ lọc hiện tại.'
              : 'Chưa có dự án nào. Bấm “Tạo dự án” để bắt đầu.'}
          </p>
        ) : (
          <ProjectList
            projects={visibleProjects}
            onOpenProject={(project) => setSelectedId(project.id)}
          />
        )}
      </div>

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      <ProjectDetailModal
        project={selectedProject}
        open={Boolean(selectedProject) && !confirmOpen}
        onClose={() => setSelectedId(null)}
        onPatch={handlePatch}
        onRequestDelete={() => setConfirmOpen(true)}
        canEdit={isAdmin}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        busy={deleting}
        title="Xóa dự án?"
        description={
          selectedProject
            ? `“${selectedProject.name}” sẽ bị xóa khỏi danh sách. Thao tác này không hoàn tác được.`
            : undefined
        }
        confirmLabel="Xóa"
      />
    </>
  )
}

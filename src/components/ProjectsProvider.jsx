import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProjectsContext } from '../utils/projectsContext'
import { calculateProjectProgress, countOverdueProjects } from '../utils/projectUtils'
import { useTasks } from '../utils/tasksContext'
import { useAuth } from '../utils/authContext'
import { useNotifications } from '../utils/notificationsContext'
import * as projectService from '../services/projectService'

/**
 * Kho dự án dùng chung cho trang /du-an.
 * Mọi thao tác đi qua `projectService` nên sau này đổi sang Firestore
 * không phải sửa component nào.
 *
 * [Phase 14] Dự án hiện tại KHÔNG có danh sách thành viên (`participantIds`)
 * như group chat — chỉ có MỘT `manager` (personRef). Đây chính là "cơ chế
 * thành viên tương ứng" duy nhất mà source có, nên thông báo phát sinh khi
 * `manager` VỪA được gán/đổi sang một người khác người đang thao tác
 * (`project_manager_assigned`) — KHÔNG tự nghĩ thêm loại thành viên khác.
 */
export default function ProjectsProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { tasks } = useTasks()
  const { notify } = useNotifications()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    if (authLoading) {
      setProjects([])
      setLoading(true)
      return () => {
        active = false
      }
    }

    if (!user) {
      setProjects([])
      setLoading(false)
      return () => {
        active = false
      }
    }

    setLoading(true)

    projectService
      .listProjects()
      .then((data) => {
        if (active) setProjects(data)
      })
      .catch((error) => {
        console.error('[ProjectsProvider] Không tải được dự án:', error)
        if (active) setProjects([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authLoading, user])

  const notifyManagerAssigned = useCallback(
    (project) => {
      if (!user || !project.manager?.id || project.manager.id === user.uid) return
      notify({
        userId: project.manager.id,
        type: 'project_manager_assigned',
        title: 'Bạn được chỉ định làm quản lý dự án',
        message: project.name,
        relatedType: 'project',
        relatedId: project.id,
        actorId: user.uid,
      }).catch((error) => console.error('[ProjectsProvider] Không gửi được thông báo dự án:', error))
    },
    [user, notify],
  )

  const addProject = useCallback(
    async (input) => {
      const created = await projectService.createProject(input)
      setProjects((current) => [created, ...current])
      notifyManagerAssigned(created)
      return created
    },
    [notifyManagerAssigned],
  )

  const patchProject = useCallback(
    async (id, patch) => {
      const before = projects.find((project) => project.id === id)
      const updated = await projectService.updateProject(id, patch)
      setProjects((current) => current.map((project) => (project.id === id ? updated : project)))

      if (before?.manager?.id !== updated.manager?.id) {
        notifyManagerAssigned(updated)
      }

      return updated
    },
    [projects, notifyManagerAssigned],
  )

  const removeProject = useCallback(async (id) => {
    await projectService.deleteProject(id)
    setProjects((current) => current.filter((project) => project.id !== id))
    return id
  }, [])

  const overdueCount = useMemo(() => countOverdueProjects(projects), [projects])
  const projectsWithProgress = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        taskProgress: calculateProjectProgress(tasks, project.id),
      })),
    [projects, tasks],
  )

  const value = useMemo(
    () => ({
      projects: projectsWithProgress,
      loading,
      overdueCount,
      addProject,
      patchProject,
      removeProject,
    }),
    [projectsWithProgress, loading, overdueCount, addProject, patchProject, removeProject],
  )

  return <ProjectsContext value={value}>{children}</ProjectsContext>
}

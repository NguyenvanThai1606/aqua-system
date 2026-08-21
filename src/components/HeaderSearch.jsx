import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import Avatar from './Avatar'
import { useTasks } from '../utils/tasksContext'
import { useProjects } from '../utils/projectsContext'
import useUserProfiles from '../utils/useUserProfiles'
import cx from '../utils/cx'

const MAX_PER_GROUP = 5
const DEBOUNCE_MS = 150

/**
 * Tìm kiếm toàn hệ thống ở Header (Phase 14) — thay ô search trang trí cũ.
 *
 * Tận dụng dữ liệu ĐÃ TẢI SẴN từ các Provider hiện có
 * (`useTasks`/`useProjects`/`useUserProfiles`) — KHÔNG gọi Firestore riêng
 * cho mỗi lần gõ phím, lọc hoàn toàn ở client (cùng cách
 * `ConversationList`/`CreateGroupModal` đã làm), nên debounce ở đây chỉ để
 * tránh dropdown "giật" khi gõ nhanh, không phải để giảm tải mạng.
 *
 * Điều hướng: Task → `/cong-viec`, Dự án → `/du-an`, Nhân sự → `/nhan-su`.
 * KHÔNG có route con theo id cho 3 trang này (Kanban/danh sách mở modal
 * chi tiết TỪ BÊN TRONG trang, không đọc id từ URL) nên chỉ điều hướng tới
 * đúng TRANG chứa — không tạo route mới chỉ để phục vụ search.
 */
export default function HeaderSearch() {
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const { tasks } = useTasks()
  const { projects } = useProjects()
  const { profiles } = useUserProfiles()

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword.trim()), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    setActiveIndex(-1)
  }, [debounced])

  useEffect(() => {
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const results = useMemo(() => {
    const q = debounced.toLowerCase()
    if (!q) return { tasks: [], projects: [], people: [] }

    return {
      tasks: tasks.filter((task) => task.title?.toLowerCase().includes(q)).slice(0, MAX_PER_GROUP),
      projects: projects.filter((project) => project.name?.toLowerCase().includes(q)).slice(0, MAX_PER_GROUP),
      people: profiles
        .filter((profile) => `${profile.displayName ?? ''} ${profile.email ?? ''}`.toLowerCase().includes(q))
        .slice(0, MAX_PER_GROUP),
    }
  }, [debounced, tasks, projects, profiles])

  const flatResults = useMemo(
    () => [
      ...results.tasks.map((item) => ({ kind: 'task', item })),
      ...results.projects.map((item) => ({ kind: 'project', item })),
      ...results.people.map((item) => ({ kind: 'person', item })),
    ],
    [results],
  )

  const hasQuery = debounced.length > 0
  const hasResults = flatResults.length > 0

  const goTo = (entry) => {
    setOpen(false)
    setKeyword('')
    if (entry.kind === 'task') navigate('/cong-viec')
    else if (entry.kind === 'project') navigate('/du-an')
    else if (entry.kind === 'person') navigate('/nhan-su')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      event.currentTarget.blur()
      return
    }

    if (!open || flatResults.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % flatResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + flatResults.length) % flatResults.length)
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      goTo(flatResults[activeIndex])
    }
  }

  const indexOf = (kind, id) => flatResults.findIndex((entry) => entry.kind === kind && entry.item.id === id)

  return (
    <div className="header-search" ref={containerRef}>
      <Icon name="search" size={17} className="header-search-icon" />
      <input
        type="search"
        className="input header-search-input"
        placeholder="Tìm công việc, dự án, nhân viên…"
        aria-label="Tìm kiếm"
        value={keyword}
        onChange={(event) => {
          setKeyword(event.target.value)
          setOpen(true)
        }}
        onFocus={() => keyword && setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {open && hasQuery && (
        <div className="header-search-dropdown">
          {!hasResults && (
            <p className="header-search-empty muted">Không tìm thấy kết quả cho “{debounced}”.</p>
          )}

          {results.tasks.length > 0 && (
            <div className="header-search-group">
              <p className="header-search-group-label">Công việc</p>
              {results.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={cx(
                    'header-search-row',
                    indexOf('task', task.id) === activeIndex && 'header-search-row-active',
                  )}
                  onClick={() => goTo({ kind: 'task', item: task })}
                >
                  <Icon name="tasks" size={15} />
                  <span className="header-search-row-label">{task.title}</span>
                </button>
              ))}
            </div>
          )}

          {results.projects.length > 0 && (
            <div className="header-search-group">
              <p className="header-search-group-label">Dự án</p>
              {results.projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={cx(
                    'header-search-row',
                    indexOf('project', project.id) === activeIndex && 'header-search-row-active',
                  )}
                  onClick={() => goTo({ kind: 'project', item: project })}
                >
                  <Icon name="projects" size={15} />
                  <span className="header-search-row-label">{project.name}</span>
                </button>
              ))}
            </div>
          )}

          {results.people.length > 0 && (
            <div className="header-search-group">
              <p className="header-search-group-label">Nhân sự</p>
              {results.people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={cx(
                    'header-search-row',
                    indexOf('person', person.id) === activeIndex && 'header-search-row-active',
                  )}
                  onClick={() => goTo({ kind: 'person', item: person })}
                >
                  <Avatar name={person.displayName} photoURL={person.photoURL} size="sm" />
                  <span className="header-search-row-label">{person.displayName || person.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

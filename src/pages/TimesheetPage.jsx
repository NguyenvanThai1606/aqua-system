import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Icon from '../components/Icon'
import { useTasks } from '../utils/tasksContext'
import { useProjects } from '../utils/projectsContext'
import { useAuth } from '../utils/authContext'
import { useToast } from '../utils/toastContext'
import useUserProfiles from '../utils/useUserProfiles'
import useDepartments from '../utils/useDepartments'
import { getUserDepartmentIds } from '../services/userService'
import * as timesheetService from '../services/timesheetService'
import { DONE_STATUS } from '../data/taskMeta'
import '../styles/timesheet.css'

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'detail', label: 'Chi tiết' },
  { id: 'people', label: 'Theo nhân viên' },
  { id: 'projects', label: 'Theo dự án' },
]
const EMPTY_FILTERS = { from: '', to: '', projectId: 'all', userId: 'all', departmentId: 'all', kind: 'all' }

function money(value) { return `${Math.round(value || 0).toLocaleString('vi-VN')} đ` }
function nameOf(profile) { return profile?.displayName?.trim() || profile?.email?.split('@')[0] || 'Người dùng' }
function normalizeDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value.toDate === 'function') return value.toDate().toISOString().slice(0, 10)
  return ''
}
function taskDate(task) { return normalizeDate(task.deadline || task.createdAt) }
function emptyForm() { return { userId: '', type: 'addition', amount: '', description: '', date: new Date().toISOString().slice(0, 10), note: '' } }

export default function TimesheetPage() {
  const { tasks, loading: tasksLoading } = useTasks()
  const { projects, loading: projectsLoading } = useProjects()
  const { user, hasPermission } = useAuth()
  const { profiles, loading: profilesLoading } = useUserProfiles()
  const { departments } = useDepartments()
  const toast = useToast()
  const canManage = hasPermission('timesheet.manage')
  const [adjustments, setAdjustments] = useState([])
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(true)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [tab, setTab] = useState('overview')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let active = true
    timesheetService.listAdjustments().then((data) => {
      if (active) setAdjustments(data)
    }).catch((error) => {
      console.error('[TimesheetPage] Không tải được khoản điều chỉnh:', error)
      if (active) setAdjustments([])
    }).finally(() => { if (active) setAdjustmentsLoading(false) })
    return () => { active = false }
  }, [])

  const profilesById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles])
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const departmentsById = useMemo(() => new Map(departments.map((department) => [department.id, department])), [departments])

  const rows = useMemo(() => {
    const taskRows = tasks.filter((task) => task.status === DONE_STATUS && task.assignee?.id).map((task) => {
      const profile = profilesById.get(task.assignee.id)
      const departmentId = getUserDepartmentIds(profile)[0] || ''
      return {
        id: `task-${task.id}`, kind: 'task', projectId: task.projectId || '',
        projectName: projectsById.get(task.projectId)?.name || 'Không thuộc dự án',
        title: task.title, userId: task.assignee.id, userName: task.assignee.name || nameOf(profile),
        departmentId, departmentName: departmentsById.get(departmentId)?.name || profile?.departmentName || 'Chưa phân bổ',
        date: taskDate(task), amount: Number(task.laborCost) || 0, adjustment: null,
      }
    })
    const adjustmentRows = adjustments.map((item) => {
      const profile = profilesById.get(item.userId)
      const departmentId = getUserDepartmentIds(profile)[0] || ''
      return {
        id: item.id, kind: item.type, projectId: '', projectName: 'Không gắn dự án', title: item.description,
        userId: item.userId, userName: item.userName || nameOf(profile), departmentId,
        departmentName: departmentsById.get(departmentId)?.name || profile?.departmentName || 'Chưa phân bổ',
        date: normalizeDate(item.date), amount: item.type === 'addition' ? item.amount : -item.amount, adjustment: item,
      }
    })
    return [...taskRows, ...adjustmentRows]
  }, [tasks, adjustments, profilesById, projectsById, departmentsById])

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (filters.from && row.date < filters.from) return false
    if (filters.to && row.date > filters.to) return false
    if (filters.projectId !== 'all' && row.projectId !== filters.projectId) return false
    if (filters.userId !== 'all' && row.userId !== filters.userId) return false
    if (filters.departmentId !== 'all' && row.departmentId !== filters.departmentId) return false
    if (filters.kind !== 'all' && row.kind !== filters.kind) return false
    return true
  }), [rows, filters])

  const summary = useMemo(() => ({
    labor: filteredRows.filter((row) => row.kind === 'task').reduce((sum, row) => sum + row.amount, 0),
    additions: filteredRows.filter((row) => row.kind === 'addition').reduce((sum, row) => sum + row.amount, 0),
    deductions: filteredRows.filter((row) => row.kind === 'deduction').reduce((sum, row) => sum + Math.abs(row.amount), 0),
    total: filteredRows.reduce((sum, row) => sum + row.amount, 0),
    tasks: filteredRows.filter((row) => row.kind === 'task').length,
    users: new Set(filteredRows.map((row) => row.userId)).size,
    projects: new Set(filteredRows.map((row) => row.projectId).filter(Boolean)).size,
  }), [filteredRows])

  const people = useMemo(() => summarize(filteredRows, 'userId', 'userName'), [filteredRows])
  const projectRows = useMemo(() => summarize(filteredRows.filter((row) => row.kind === 'task'), 'projectId', 'projectName'), [filteredRows])
  const departmentRows = useMemo(() => summarize(filteredRows.filter((row) => row.kind === 'task'), 'departmentId', 'departmentName'), [filteredRows])
  const loading = tasksLoading || projectsLoading || profilesLoading || adjustmentsLoading
  const updateFilter = (name, value) => setFilters((previous) => ({ ...previous, [name]: value }))
  const resetFilters = () => setFilters({ ...EMPTY_FILTERS })
  const closeAdjustmentModal = useCallback(() => setModalOpen(false), [])

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormError(''); setModalOpen(true) }
  const openEdit = (item) => { setEditing(item); setForm({ ...item, amount: String(item.amount ?? '') }); setFormError(''); setModalOpen(true) }
  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    const amount = Number(form.amount)
    const validationMessage = !form.userId
      ? 'Hãy chọn người nhận.'
      : !Number.isFinite(amount) || amount <= 0
        ? 'Số tiền phải là số lớn hơn 0.'
        : !form.description.trim()
          ? 'Nội dung là bắt buộc.'
          : !form.date
            ? 'Ngày là bắt buộc.'
            : ''
    if (validationMessage) {
      setFormError(validationMessage)
      toast.error('Không thể lưu khoản điều chỉnh', { message: validationMessage })
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const profile = profilesById.get(form.userId)
      const payload = { ...form, userName: nameOf(profile), amount }
      const result = editing ? await timesheetService.updateAdjustment(editing.id, payload) : await timesheetService.createAdjustment(payload, user)
      setAdjustments((current) => editing ? current.map((item) => item.id === result.id ? result : item) : [result, ...current])
      setModalOpen(false)
      toast.success(editing ? 'Đã cập nhật khoản điều chỉnh' : 'Đã thêm khoản điều chỉnh')
    } catch (error) { toast.error('Không thể lưu khoản điều chỉnh', { message: error.message }) } finally { setSaving(false) }
  }
  const remove = async () => {
    if (!deleting) return
    try {
      await timesheetService.deleteAdjustment(deleting.id)
      setAdjustments((current) => current.filter((item) => item.id !== deleting.id))
      setDeleting(null)
      toast.success('Đã xóa khoản điều chỉnh')
    } catch (error) { toast.error('Không thể xóa khoản điều chỉnh', { message: error.message }) }
  }

  return <>
    <PageHeader icon="reports" title="Bảng chấm công" description="Tổng hợp tiền công từ công việc hoàn thành và các khoản điều chỉnh." actions={canManage && <button type="button" className="btn btn-primary" onClick={openCreate}><Icon name="plus" size={16} /> Thêm khoản điều chỉnh</button>} />
    <div className="timesheet-page">
      <div className="timesheet-summary-grid">{[['Tiền công', money(summary.labor)], ['Cộng thêm', money(summary.additions)], ['Khấu trừ', money(summary.deductions)], ['Tổng thực tế', money(summary.total)], ['Việc hoàn thành', summary.tasks], ['Số người', summary.users], ['Số dự án', summary.projects]].map(([label, value]) => <article className="timesheet-summary-card" key={label}><p>{label}</p><strong>{value}</strong></article>)}</div>
      <Card><div className="timesheet-filters"><Filter label="Từ ngày"><input className="input" type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} /></Filter><Filter label="Đến ngày"><input className="input" type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} /></Filter><Filter label="Dự án"><select className="select" value={filters.projectId} onChange={(e) => updateFilter('projectId', e.target.value)}><option value="all">Tất cả</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Filter><Filter label="Người thực hiện"><select className="select" value={filters.userId} onChange={(e) => updateFilter('userId', e.target.value)}><option value="all">Tất cả</option>{profiles.map((item) => <option key={item.id} value={item.id}>{nameOf(item)}</option>)}</select></Filter><Filter label="Bộ phận"><select className="select" value={filters.departmentId} onChange={(e) => updateFilter('departmentId', e.target.value)}><option value="all">Tất cả</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Filter><Filter label="Loại"><select className="select" value={filters.kind} onChange={(e) => updateFilter('kind', e.target.value)}><option value="all">Tất cả</option><option value="task">Công việc</option><option value="addition">Cộng thêm</option><option value="deduction">Khấu trừ</option></select></Filter><button type="button" className="btn btn-secondary timesheet-reset" onClick={resetFilters}>Đặt lại bộ lọc</button></div></Card>
      <div className="timesheet-tabs" role="tablist">{TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'timesheet-tab timesheet-tab-active' : 'timesheet-tab'} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
      {loading ? <p className="timesheet-state muted">Đang tải bảng chấm công…</p> : <>{tab === 'overview' && <div className="timesheet-chart-grid"><Chart title="Tiền công theo người" items={people} /><Chart title="Tiền công theo dự án" items={projectRows} /><Chart title="Tiền công theo bộ phận" items={departmentRows} /></div>}{tab === 'people' && <SummaryTable title="Theo nhân viên" items={people} people />}{tab === 'projects' && <SummaryTable title="Theo dự án" items={projectRows} />}{(tab === 'overview' || tab === 'detail') && <DetailTable rows={filteredRows} canManage={canManage} onEdit={openEdit} onDelete={setDeleting} />}</>}
    </div>
    <Modal open={modalOpen} onClose={closeAdjustmentModal} title={editing ? 'Sửa khoản điều chỉnh' : 'Thêm khoản điều chỉnh'} description="Khoản cộng thêm hoặc khấu trừ không gắn bắt buộc với task." footer={<><button type="button" className="btn btn-secondary" onClick={closeAdjustmentModal}>Hủy</button><button type="submit" form="adjustment-form" className="btn btn-primary" disabled={saving}>Lưu</button></>}><form id="adjustment-form" className="timesheet-form" onSubmit={save}><Filter label="Người nhận"><select className="select" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}><option value="">Chọn người</option>{profiles.map((item) => <option key={item.id} value={item.id}>{nameOf(item)}</option>)}</select></Filter><Filter label="Loại"><select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="addition">Cộng thêm</option><option value="deduction">Khấu trừ</option></select></Filter><Filter label="Số tiền"><input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Filter><Filter label="Nội dung"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Filter><Filter label="Ngày"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Filter><Filter label="Ghi chú"><textarea className="textarea" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Filter>{formError && <p className="timesheet-form-error">{formError}</p>}</form></Modal>
    <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="Xóa khoản điều chỉnh?" description={deleting?.description} confirmLabel="Xóa" />
  </>
}

function Filter({ label, children }) { return <label className="field"><span className="field-label">{label}</span>{children}</label> }
function summarize(rows, key, nameKey) { const map = new Map(); rows.forEach((row) => { const item = map.get(row[key]) || { id: row[key], name: row[nameKey], tasks: 0, users: new Set(), additions: 0, deductions: 0, total: 0 }; if (row.kind === 'task') { item.tasks += 1; item.users.add(row.userId) } if (row.kind === 'addition') item.additions += row.amount; if (row.kind === 'deduction') item.deductions += Math.abs(row.amount); item.total += row.amount; map.set(row[key], item) }); return [...map.values()].sort((a, b) => b.total - a.total).map((item) => ({ ...item, users: item.users.size, value: item.total, label: item.name })) }
function Chart({ title, items }) { const max = Math.max(...items.map((item) => item.value), 1); return <Card title={title}><div className="timesheet-chart">{items.length ? items.slice(0, 8).map((item) => <div className="timesheet-chart-row" key={item.id}><span>{item.label}</span><div><i style={{ width: `${Math.max(item.value / max * 100, item.value ? 3 : 0)}%` }} /></div><strong>{money(item.value)}</strong></div>) : <p className="muted">Chưa có dữ liệu.</p>}</div></Card> }
function SummaryTable({ title, items, people = false }) { return <Card title={title}><div className="timesheet-table-wrap"><table className="timesheet-table"><thead><tr><th>{people ? 'Người' : 'Dự án'}</th><th>Công việc</th>{people ? <><th>Cộng thêm</th><th>Khấu trừ</th><th>Tổng</th></> : <><th>Người</th><th>Chi phí nhân công</th></>}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.tasks}</td>{people ? <><td>{money(item.additions)}</td><td>{money(item.deductions)}</td><td>{money(item.total)}</td></> : <><td>{item.users}</td><td>{money(item.total)}</td></>}</tr>)}</tbody></table></div></Card> }
function DetailTable({ rows, canManage, onEdit, onDelete }) { return <Card title="Chi tiết"><div className="timesheet-table-wrap"><table className="timesheet-table"><thead><tr><th>Dự án</th><th>Công việc</th><th>Người thực hiện</th><th>Bộ phận</th><th>Ngày</th><th>Tiền</th><th>Loại</th>{canManage && <th />}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.projectName}</td><td>{row.title}</td><td>{row.userName}</td><td>{row.departmentName}</td><td>{row.date}</td><td className={row.amount < 0 ? 'timesheet-negative' : undefined}>{money(row.amount)}</td><td>{row.kind === 'task' ? 'Công việc' : row.kind === 'addition' ? 'Cộng thêm' : 'Khấu trừ'}</td>{canManage && <td>{row.adjustment && <span className="timesheet-row-actions"><button type="button" className="btn btn-ghost" onClick={() => onEdit(row.adjustment)}>Sửa</button><button type="button" className="btn btn-ghost" onClick={() => onDelete(row.adjustment)}>Xóa</button></span>}</td>}</tr>)}</tbody></table></div></Card> }

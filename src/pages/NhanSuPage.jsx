import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import PersonnelFilters from '../components/personnel/PersonnelFilters'
import PersonnelList from '../components/personnel/PersonnelList'
import PersonnelDetailModal from '../components/personnel/PersonnelDetailModal'
import OrgChart from '../components/personnel/OrgChart'
import DepartmentFormModal from '../components/personnel/DepartmentFormModal'
import AddMemberModal from '../components/personnel/AddMemberModal'
import useUserProfiles from '../utils/useUserProfiles'
import useDepartments from '../utils/useDepartments'
import usePositions from '../utils/usePositions'
import usePersonnelFilters from '../utils/usePersonnelFilters'
import { useAuth } from '../utils/authContext'
import { useToast } from '../utils/toastContext'
import { updatePersonnelProfile } from '../services/userService'
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from '../services/departmentService'
import '../styles/personnel.css'

const TABS = [
  { id: 'list', label: 'Danh sách nhân sự' },
  { id: 'org', label: 'Cơ cấu tổ chức' },
]

function displayNameOf(profile) {
  return profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'
}

/**
 * Module NHÂN SỰ (Phase 10) — MỘT route duy nhất `/nhan-su`, chuyển đổi
 * bằng tab thay vì hai trang riêng ("Danh sách nhân sự" / "Cơ cấu tổ
 * chức"), theo đúng yêu cầu không tách hai chức năng.
 *
 * Nguồn dữ liệu: Firestore `users/{uid}` thật (qua `useUserProfiles()` —
 * cùng hook đang dùng cho picker "Người phụ trách" ở Project/Task từ
 * Phase 6-7) và `departments/{departmentId}` (Phase 10, mới). KHÔNG dùng
 * `data/members.js`.
 *
 * Phân quyền: mọi user đã đăng nhập xem được cả hai tab (khớp Firestore
 * Rules `allow list/read: if isSignedIn()`). Chỉ admin (`isAdmin`) thấy
 * form sửa chức vụ/phòng ban/trạng thái trong modal chi tiết, và các nút
 * quản lý phòng ban ở tab Cơ cấu tổ chức — enforced lại một lần nữa ở
 * `firestore.rules`, trang này không phải lớp bảo vệ duy nhất.
 */
export default function NhanSuPage() {
  const { isAdmin } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('list')

  const { profiles, loading: profilesLoading, reload: reloadProfiles } = useUserProfiles()
  const { departments, loading: departmentsLoading, reload: reloadDepartments } = useDepartments()
  const { positions } = usePositions()

  const { filters, setFilters, visibleProfiles, isFiltering, resetFilters } =
    usePersonnelFilters(profiles)

  const [selectedProfileId, setSelectedProfileId] = useState(null)
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null

  const [departmentFormOpen, setDepartmentFormOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [deletingDepartment, setDeletingDepartment] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [addMemberDepartment, setAddMemberDepartment] = useState(null)

  const handleSavePersonnel = async (patch) => {
    if (!selectedProfile) return
    try {
      await updatePersonnelProfile(selectedProfile.id, patch)
      await reloadProfiles()
      toast.success('Đã cập nhật thông tin nhân sự', { message: displayNameOf(selectedProfile) })
      setSelectedProfileId(null)
    } catch (error) {
      toast.error('Không thể cập nhật thông tin nhân sự', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    }
  }

  // Phase 14 — gán/gỡ nhân sự trực tiếp từ card phòng ban (tab "Cơ cấu tổ
  // chức"). Dùng lại đúng `updatePersonnelProfile()` + Rules Phase 10, chỉ
  // đổi `departmentId`/`departmentName` — không field/nhánh Rules mới.
  const handleAddMember = async (profile, department) => {
    try {
      await updatePersonnelProfile(profile.id, {
        departmentId: department.id,
        departmentName: department.name,
      })
      await reloadProfiles()
      toast.success('Đã thêm nhân sự vào phòng ban', {
        message: `${displayNameOf(profile)} → ${department.name}`,
      })
    } catch (error) {
      toast.error('Không thể thêm nhân sự vào phòng ban', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    }
  }

  const handleRemoveMember = async (profile) => {
    try {
      await updatePersonnelProfile(profile.id, { departmentId: null, departmentName: null })
      await reloadProfiles()
      toast.success('Đã gỡ nhân sự khỏi phòng ban', { message: displayNameOf(profile) })
    } catch (error) {
      toast.error('Không thể gỡ nhân sự khỏi phòng ban', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    }
  }

  const openCreateDepartment = () => {
    setEditingDepartment(null)
    setDepartmentFormOpen(true)
  }

  const openEditDepartment = (department) => {
    setEditingDepartment(department)
    setDepartmentFormOpen(true)
  }

  const handleSubmitDepartment = async (data) => {
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, data)
        toast.success('Đã cập nhật phòng ban', { message: data.name })
      } else {
        await createDepartment(data)
        toast.success('Đã tạo phòng ban', { message: data.name })
      }
      setDepartmentFormOpen(false)
      await reloadDepartments()
    } catch (error) {
      toast.error('Không thể lưu phòng ban', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    }
  }

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment) return
    setDeletingBusy(true)
    try {
      await deleteDepartment(deletingDepartment.id)
      toast.success('Đã xóa phòng ban', { message: deletingDepartment.name })
      setDeletingDepartment(null)
      await reloadDepartments()
    } catch (error) {
      toast.error('Không thể xóa phòng ban', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setDeletingBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        icon="employees"
        title="Nhân sự"
        description="Danh sách nhân sự và cơ cấu tổ chức của công ty."
      />

      <div className="personnel-page">
        <div className="personnel-tabs" role="tablist" aria-label="Chế độ xem Nhân sự">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? 'personnel-tab personnel-tab-active' : 'personnel-tab'}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'list' ? (
          <>
            <PersonnelFilters
              filters={filters}
              onChange={setFilters}
              departments={departments}
              departmentsLoading={departmentsLoading}
            />

            <p className="personnel-summary">
              Hiển thị <strong>{visibleProfiles.length}</strong> / {profiles.length} nhân sự
              {isFiltering && (
                <button type="button" className="personnel-summary-reset" onClick={resetFilters}>
                  Xóa bộ lọc
                </button>
              )}
            </p>

            {profilesLoading ? (
              <p className="personnel-state muted">Đang tải danh sách nhân sự…</p>
            ) : visibleProfiles.length === 0 ? (
              <p className="personnel-state muted">
                {isFiltering
                  ? 'Không có nhân sự nào khớp với bộ lọc hiện tại.'
                  : 'Chưa có nhân sự nào.'}
              </p>
            ) : (
              <PersonnelList
                profiles={visibleProfiles}
                onOpenProfile={(profile) => setSelectedProfileId(profile.id)}
              />
            )}
          </>
        ) : (
          <OrgChart
            profiles={profiles}
            departments={departments}
            canManage={isAdmin}
            onAddDepartment={openCreateDepartment}
            onEditDepartment={openEditDepartment}
            onDeleteDepartment={(department) => setDeletingDepartment(department)}
            onAddMember={(department) => setAddMemberDepartment(department)}
            onRemoveMember={handleRemoveMember}
          />
        )}
      </div>

      <PersonnelDetailModal
        profile={selectedProfile}
        open={Boolean(selectedProfile)}
        onClose={() => setSelectedProfileId(null)}
        canEdit={isAdmin}
        departments={departments}
        departmentsLoading={departmentsLoading}
        positions={positions}
        onSave={handleSavePersonnel}
      />

      {isAdmin && (
        <>
          <AddMemberModal
            open={Boolean(addMemberDepartment)}
            onClose={() => setAddMemberDepartment(null)}
            department={addMemberDepartment}
            profiles={profiles}
            onAdd={async (profile, department) => {
              await handleAddMember(profile, department)
              setAddMemberDepartment(null)
            }}
          />

          <DepartmentFormModal
            open={departmentFormOpen}
            onClose={() => setDepartmentFormOpen(false)}
            onSubmit={handleSubmitDepartment}
            department={editingDepartment}
            profiles={profiles}
            profilesLoading={profilesLoading}
          />

          <ConfirmDialog
            open={Boolean(deletingDepartment)}
            onClose={() => !deletingBusy && setDeletingDepartment(null)}
            onConfirm={handleDeleteDepartment}
            busy={deletingBusy}
            title="Xóa phòng ban?"
            description={
              deletingDepartment
                ? `“${deletingDepartment.name}” sẽ bị xóa. Nhân sự đang thuộc phòng ban này sẽ chuyển sang “Chưa phân bổ” — không xóa hay mất dữ liệu nhân sự.`
                : undefined
            }
            confirmLabel="Xóa"
          />
        </>
      )}
    </>
  )
}

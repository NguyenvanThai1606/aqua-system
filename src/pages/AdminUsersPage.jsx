import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Icon from '../components/Icon'
import Avatar from '../components/Avatar'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../utils/authContext'
import { useToast } from '../utils/toastContext'
import { deleteUserProfile, listUserProfiles, updateUserRole } from '../services/userService'
import { createPosition, deletePosition } from '../services/positionService'
import usePositions from '../utils/usePositions'
import '../styles/admin-users.css'

const ROLE_LABEL = {
  admin: 'Quản trị viên',
  user: 'Thành viên',
}

function displayNameOf(profile) {
  return profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'
}

/**
 * Trang quản trị: danh sách người dùng + cấp/thu quyền admin.
 *
 * Route này chỉ render khi `<RequireAdmin>` cho qua (xem `App.jsx`), NHƯNG
 * thao tác đổi role vẫn được xác thực lại ở tầng Firestore Security Rules —
 * trang này không phải là lớp bảo vệ duy nhất.
 */
export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const toast = useToast()

  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingTarget, setPendingTarget] = useState(null) // { id, nextRole, name }
  const [saving, setSaving] = useState(false)
  const [deletingTarget, setDeletingTarget] = useState(null) // { id, name }
  const [deleting, setDeleting] = useState(false)

  // [Phase 15] Danh mục CHỨC VỤ — quản lý ở đây (thêm/xóa), dùng làm gợi ý
  // ở ô "Chức vụ" trong module Nhân sự (`PersonnelDetailModal`).
  const { positions, loading: positionsLoading, reload: reloadPositions } = usePositions()
  const [newPositionName, setNewPositionName] = useState('')
  const [positionSaving, setPositionSaving] = useState(false)
  const [deletingPosition, setDeletingPosition] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listUserProfiles()
      setProfiles(data)
    } catch (error) {
      toast.error('Không thể tải danh sách người dùng', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const requestRoleChange = (profile, nextRole) => {
    if (profile.id === currentUser?.uid) return // không tự đổi role của chính mình
    setPendingTarget({ id: profile.id, nextRole, name: displayNameOf(profile) })
  }

  const requestDelete = (profile) => {
    if (profile.id === currentUser?.uid || saving || deleting) return
    setDeletingTarget({ id: profile.id, name: displayNameOf(profile) })
  }

  const confirmDelete = async () => {
    if (!deletingTarget || deleting) return

    setDeleting(true)
    try {
      await deleteUserProfile(deletingTarget.id)
      setProfiles((current) => current.filter((profile) => profile.id !== deletingTarget.id))
      toast.success('Đã xóa hồ sơ người dùng', { message: deletingTarget.name })
      setDeletingTarget(null)
    } catch (error) {
      toast.error('Không thể xóa hồ sơ người dùng', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setDeleting(false)
    }
  }

  const confirmRoleChange = async () => {
    if (!pendingTarget) return
    setSaving(true)
    try {
      await updateUserRole(pendingTarget.id, pendingTarget.nextRole)
      setProfiles((current) =>
        current.map((profile) =>
          profile.id === pendingTarget.id ? { ...profile, role: pendingTarget.nextRole } : profile,
        ),
      )
      toast.success('Đã cập nhật quyền', {
        message: `${pendingTarget.name} → ${ROLE_LABEL[pendingTarget.nextRole]}`,
      })
      setPendingTarget(null)
    } catch (error) {
      toast.error('Không thể cập nhật quyền', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddPosition = async (event) => {
    event.preventDefault()
    const name = newPositionName.trim()
    if (!name || positionSaving) return

    setPositionSaving(true)
    try {
      await createPosition({ name })
      await reloadPositions()
      setNewPositionName('')
      toast.success('Đã thêm chức vụ', { message: name })
    } catch (error) {
      toast.error('Không thể thêm chức vụ', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setPositionSaving(false)
    }
  }

  const handleDeletePosition = async () => {
    if (!deletingPosition) return
    setPositionSaving(true)
    try {
      await deletePosition(deletingPosition.id)
      await reloadPositions()
      toast.success('Đã xóa chức vụ', { message: deletingPosition.name })
      setDeletingPosition(null)
    } catch (error) {
      toast.error('Không thể xóa chức vụ', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setPositionSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        icon="shield"
        title="Quản lý người dùng"
        description="Xem danh sách tài khoản và cấp/thu quyền quản trị (admin)."
      />

      <Card>
        {loading ? (
          <p className="muted">Đang tải danh sách người dùng…</p>
        ) : profiles.length === 0 ? (
          <p className="muted">Chưa có tài khoản nào.</p>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const isSelf = profile.id === currentUser?.uid
                  const isAdminRole = profile.role === 'admin'

                  return (
                    <tr key={profile.id}>
                      <td>
                        {/* Phase 9: hiển thị ảnh đại diện (`photoURL` là URL
                            người dùng tự dán, không phải file Storage) —
                            `Avatar` tự fallback về chữ cái đầu nếu chưa có
                            ảnh hoặc ảnh lỗi. Trang này CHỈ đọc ảnh; admin
                            không có quyền sửa ảnh của người khác (xem
                            `firestore.rules`). */}
                        <div className="admin-users-identity">
                          <Avatar
                            name={displayNameOf(profile)}
                            photoURL={profile.photoURL}
                            size="md"
                          />
                          <div className="admin-users-identity-text">
                            <p className="admin-users-name">
                              {displayNameOf(profile)}
                              {isSelf && <span className="muted"> (bạn)</span>}
                            </p>
                            <p className="admin-users-email muted">{profile.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${isAdminRole ? 'badge-primary' : 'badge-neutral'}`}
                        >
                          {ROLE_LABEL[profile.role] ?? ROLE_LABEL.user}
                        </span>
                      </td>
                      <td className="admin-users-actions">
                        {isSelf ? (
                          <span className="muted" title="Không thể tự đổi quyền của chính mình">
                            —
                          </span>
                        ) : (
                          <>
                            {isAdminRole ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => requestRoleChange(profile, 'user')}
                                disabled={deleting || saving}
                              >
                                Thu quyền admin
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => requestRoleChange(profile, 'admin')}
                                disabled={deleting || saving}
                              >
                                <Icon name="shield" size={15} />
                                Cấp quyền admin
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-sm"
                              onClick={() => requestDelete(profile)}
                              disabled={deleting || saving}
                            >
                              <Icon name="error" size={15} />
                              Xóa hồ sơ
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* [Phase 15] Danh mục CHỨC VỤ — Admin thêm/xóa; danh sách này xuất
          hiện lại dưới dạng gợi ý (`<datalist>`) ở ô "Chức vụ" trong module
          Nhân sự (`PersonnelDetailModal`), KHÔNG ép chọn trong danh sách. */}
      <Card className="admin-positions-card">
        <div className="admin-positions-header">
          <div>
            <h2 className="admin-positions-title">Danh mục chức vụ</h2>
            <p className="muted admin-positions-desc">
              Chức vụ thêm ở đây sẽ xuất hiện làm gợi ý khi sửa hồ sơ nhân sự.
            </p>
          </div>
        </div>

        <form className="admin-positions-form" onSubmit={handleAddPosition}>
          <input
            type="text"
            className="input"
            placeholder="Ví dụ: Trưởng phòng Kỹ thuật"
            value={newPositionName}
            onChange={(event) => setNewPositionName(event.target.value)}
            maxLength={80}
            disabled={positionSaving}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={positionSaving || !newPositionName.trim()}
          >
            <Icon name="plus" size={15} />
            Thêm chức vụ
          </button>
        </form>

        {positionsLoading ? (
          <p className="muted">Đang tải danh mục chức vụ…</p>
        ) : positions.length === 0 ? (
          <p className="muted">Chưa có chức vụ nào trong danh mục.</p>
        ) : (
          <ul className="admin-positions-list">
            {positions.map((position) => (
              <li key={position.id} className="admin-positions-item">
                <span>{position.name}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setDeletingPosition(position)}
                  aria-label={`Xóa chức vụ ${position.name}`}
                  title="Xóa chức vụ"
                  disabled={positionSaving}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingTarget)}
        onClose={() => !saving && setPendingTarget(null)}
        onConfirm={confirmRoleChange}
        busy={saving}
        tone={pendingTarget?.nextRole === 'admin' ? 'primary' : 'danger'}
        title={
          pendingTarget?.nextRole === 'admin'
            ? 'Cấp quyền quản trị?'
            : 'Thu quyền quản trị?'
        }
        description={
          pendingTarget
            ? pendingTarget.nextRole === 'admin'
              ? `"${pendingTarget.name}" sẽ có toàn quyền quản trị hệ thống, bao gồm quản lý người dùng.`
              : `"${pendingTarget.name}" sẽ không còn quyền truy cập các chức năng quản trị.`
            : undefined
        }
        confirmLabel="Xác nhận"
      />

      <ConfirmDialog
        open={Boolean(deletingTarget)}
        onClose={() => !deleting && setDeletingTarget(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        tone="danger"
        title="Xóa hồ sơ người dùng?"
        description={
          deletingTarget
            ? `Hồ sơ Firestore của “${deletingTarget.name}” sẽ bị xóa. Tài khoản Firebase Authentication và dữ liệu nghiệp vụ liên quan sẽ không bị xóa tự động.`
            : undefined
        }
        confirmLabel="Xóa hồ sơ"
      />

      <ConfirmDialog
        open={Boolean(deletingPosition)}
        onClose={() => !positionSaving && setDeletingPosition(null)}
        onConfirm={handleDeletePosition}
        busy={positionSaving}
        tone="danger"
        title="Xóa chức vụ?"
        description={
          deletingPosition
            ? `"${deletingPosition.name}" sẽ bị xóa khỏi danh mục gợi ý. Chức vụ đã gán cho nhân sự KHÔNG bị đổi hay mất — chỉ danh mục gợi ý bị xóa.`
            : undefined
        }
        confirmLabel="Xóa"
      />
    </>
  )
}

import Avatar from '../Avatar'
import { getEmploymentStatusMeta } from '../../data/employeeMeta'

const ROLE_LABEL = {
  admin: 'Quản trị viên',
  user: 'Thành viên',
}

function displayNameOf(profile) {
  return profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'
}

/**
 * Bảng Danh sách nhân sự. Nút "Chi tiết" ở cột cuối mở
 * `PersonnelDetailModal` — modal tự quyết định xem hay sửa dựa vào
 * `canEdit` (chỉ admin), nên không cần nút riêng theo vai trò. Dùng nút
 * thật (không phải `<tr onClick>`/`role="button"`) — cùng cách làm với
 * `AdminUsersPage` để giữ hàng bảng có ngữ nghĩa/khả năng truy cập chuẩn.
 */
export default function PersonnelList({ profiles, onOpenProfile }) {
  return (
    <div className="personnel-table-wrap">
      <table className="personnel-table">
        <thead>
          <tr>
            <th>Nhân sự</th>
            <th>Chức vụ</th>
            <th>Phòng ban</th>
            <th>Trạng thái</th>
            <th>Vai trò hệ thống</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => {
            const status = getEmploymentStatusMeta(profile.employmentStatus)
            const isAdminRole = profile.role === 'admin'

            return (
              <tr key={profile.id} className="personnel-row">
                <td>
                  <div className="personnel-identity">
                    <Avatar name={displayNameOf(profile)} photoURL={profile.photoURL} size="md" />
                    <div className="personnel-identity-text">
                      <p className="personnel-name">{displayNameOf(profile)}</p>
                      <p className="personnel-email muted">{profile.email ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td>
                  {profile.position || <span className="personnel-cell-muted">Chưa cập nhật</span>}
                </td>
                <td>
                  {profile.departmentName || (
                    <span className="personnel-cell-muted">Chưa phân bổ</span>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${status.tone}`}>{status.label}</span>
                </td>
                <td>
                  <span className={`badge ${isAdminRole ? 'badge-primary' : 'badge-neutral'}`}>
                    {ROLE_LABEL[profile.role] ?? ROLE_LABEL.user}
                  </span>
                </td>
                <td className="personnel-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenProfile(profile)}
                  >
                    Chi tiết
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

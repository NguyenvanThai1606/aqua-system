import Avatar from '../Avatar'
import Icon from '../Icon'
import { getEmploymentStatusMeta } from '../../data/employeeMeta'

function displayNameOf(profile) {
  return profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'
}

function EmployeeRow({ profile, canManage = false, onRemove }) {
  const status = getEmploymentStatusMeta(profile.employmentStatus)

  return (
    <div className="personnel-org-employee">
      <Avatar name={displayNameOf(profile)} photoURL={profile.photoURL} size="sm" />
      <div className="personnel-org-employee-text">
        <p className="personnel-org-employee-name">{displayNameOf(profile)}</p>
        <p className="personnel-org-employee-meta">
          <span>{profile.position || 'Chưa cập nhật chức vụ'}</span>
          <span aria-hidden="true">·</span>
          <span className={`badge badge-${status.tone}`}>{status.label}</span>
        </p>
      </div>
      {canManage && onRemove && (
        <button
          type="button"
          className="icon-btn"
          onClick={() => onRemove(profile)}
          aria-label={`Gỡ ${displayNameOf(profile)} khỏi phòng ban`}
          title="Gỡ khỏi phòng ban"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  )
}

/**
 * Cơ cấu tổ chức: nhân viên được nhóm theo phòng ban, mỗi phòng ban một
 * Card. Nhân viên chưa có `departmentId` (hoặc trỏ tới phòng ban đã bị
 * xóa) rơi vào nhóm "Chưa phân bổ" ở cuối — không mất dữ liệu, chỉ chờ
 * admin gán lại.
 */
export default function OrgChart({
  profiles,
  departments,
  canManage = false,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
  onAddMember,
  onRemoveMember,
}) {
  const departmentIds = new Set(departments.map((department) => department.id))
  const unassigned = profiles.filter(
    (profile) => !profile.departmentId || !departmentIds.has(profile.departmentId),
  )

  return (
    <>
      {canManage && (
        <div className="personnel-org-toolbar">
          <button type="button" className="btn btn-primary" onClick={onAddDepartment}>
            <Icon name="plus" size={16} />
            Thêm phòng ban
          </button>
        </div>
      )}

      {departments.length === 0 && unassigned.length === 0 ? (
        <p className="personnel-state muted">Chưa có phòng ban hoặc nhân sự nào.</p>
      ) : (
        <div className="personnel-org-grid">
          {departments.map((department) => {
            const employees = profiles.filter((profile) => profile.departmentId === department.id)

            return (
              <section key={department.id} className="personnel-org-card">
                <header className="personnel-org-card-header">
                  <div>
                    <h3 className="personnel-org-card-title">{department.name}</h3>
                    <span className="personnel-org-card-count">{employees.length} nhân sự</span>
                  </div>

                  {canManage && (
                    <div className="personnel-org-card-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => onAddMember(department)}
                        aria-label={`Thêm nhân sự vào ${department.name}`}
                        title="Thêm nhân sự"
                      >
                        <Icon name="plus" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => onEditDepartment(department)}
                        aria-label={`Sửa phòng ban ${department.name}`}
                        title="Sửa phòng ban"
                      >
                        <Icon name="settings" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => onDeleteDepartment(department)}
                        aria-label={`Xóa phòng ban ${department.name}`}
                        title="Xóa phòng ban"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  )}
                </header>

                <div className="personnel-org-employees">
                  {employees.length === 0 ? (
                    <p className="personnel-org-empty">Chưa có nhân sự trong phòng ban này.</p>
                  ) : (
                    employees.map((profile) => (
                      <EmployeeRow
                        key={profile.id}
                        profile={profile}
                        canManage={canManage}
                        onRemove={onRemoveMember}
                      />
                    ))
                  )}
                </div>
              </section>
            )
          })}

          {unassigned.length > 0 && (
            <section className="personnel-org-card">
              <header className="personnel-org-card-header">
                <div>
                  <h3 className="personnel-org-card-title">Chưa phân bổ</h3>
                  <span className="personnel-org-card-count">{unassigned.length} nhân sự</span>
                </div>
              </header>

              <div className="personnel-org-employees">
                {unassigned.map((profile) => (
                  <EmployeeRow key={profile.id} profile={profile} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}

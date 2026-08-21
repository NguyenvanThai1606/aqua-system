/**
 * Danh sách người có thể được giao việc.
 * Tạm thời cố định — sau này lấy từ collection `members` trên Firestore.
 */

const members = [
  { id: 'u-01', name: 'Nguyễn Minh Anh', initials: 'MA', role: 'Quản trị viên' },
  { id: 'u-02', name: 'Trần Quốc Bảo', initials: 'QB', role: 'Trưởng phòng kỹ thuật' },
  { id: 'u-03', name: 'Lê Thu Hà', initials: 'TH', role: 'Thiết kế' },
  { id: 'u-04', name: 'Phạm Đức Duy', initials: 'ĐD', role: 'Lập trình viên' },
  { id: 'u-05', name: 'Vũ Khánh Linh', initials: 'KL', role: 'Nhân sự' },
  { id: 'u-06', name: 'Đỗ Hoàng Nam', initials: 'HN', role: 'Kinh doanh' },
]

const MEMBER_MAP = new Map(members.map((member) => [member.id, member]))

export function getMember(id) {
  return MEMBER_MAP.get(id) ?? null
}

/** Rút gọn thành dạng lưu kèm trong task (denormalize cho Firestore). */
export function toAssignee(id) {
  const member = getMember(id)
  if (!member) return null
  return { id: member.id, name: member.name, initials: member.initials }
}

export default members

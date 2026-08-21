/**
 * Định nghĩa toàn bộ menu điều hướng.
 * Thêm/bớt mục ở đây là sidebar và router tự cập nhật theo.
 */

const navigation = [
  {
    section: 'Tổng quan',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      // badgeKey: số đếm động — Sidebar tự lấy từ state, không ghi cứng ở đây.
      { to: '/cong-viec', label: 'Công việc', icon: 'tasks', badgeKey: 'overdueTasks' },
      { to: '/du-an', label: 'Dự án', icon: 'projects', badgeKey: 'overdueProjects' },
    ],
  },
  {
    section: 'Con người',
    items: [
      // Phase 10 — MỘT mục duy nhất "Nhân sự", gộp "Nhân viên" (Quản lý
      // nhân sự) + "Cơ cấu tổ chức" cũ vào cùng route /nhan-su, chuyển chế
      // độ xem bằng tab bên trong trang (xem pages/NhanSuPage.jsx). KHÔNG
      // tạo hai mục sidebar riêng.
      { to: '/nhan-su', label: 'Nhân sự', icon: 'employees' },
      { to: '/tin-nhan', label: 'Tin nhắn', icon: 'messages', badgeKey: 'unreadMessages' },
      { to: '/lich', label: 'Lịch', icon: 'calendar' },
      { to: '/cham-cong', label: 'Chấm công', icon: 'attendance' },
    ],
  },
  {
    section: 'Phân tích',
    items: [{ to: '/bao-cao-kpi', label: 'Báo cáo & KPI', icon: 'reports' }],
  },
  {
    section: 'Hệ thống',
    items: [
      { to: '/thong-bao', label: 'Thông báo', icon: 'bell', badgeKey: 'unreadNotifications' },
      { to: '/cai-dat', label: 'Cài đặt', icon: 'settings' },
    ],
  },
  {
    section: 'Quản trị',
    // Mục trong nhóm này chỉ hiển thị cho role 'admin' — xem Sidebar.jsx.
    // Quyền truy cập THẬT SỰ được kiểm soát ở route (RequireAdmin) và
    // Firestore Security Rules, đây chỉ là hiển thị.
    items: [
      {
        to: '/quan-tri/nguoi-dung',
        label: 'Quản lý người dùng',
        icon: 'shield',
        adminOnly: true,
      },
    ],
  },
]

/** Danh sách phẳng — dùng cho router và tra cứu tiêu đề trang. */
export const flatNavigation = navigation.flatMap((group) => group.items)

/**
 * Trang CÓ route nhưng KHÔNG nằm trên sidebar — chỉ vào được từ UserMenu.
 *
 * `Header` tra tiêu đề trang trong `flatNavigation`; nếu không khớp mục nào nó
 * hiển thị "Không tìm thấy trang". Vì `/profile` cố tình không có mục sidebar
 * (hồ sơ là của riêng từng người, không phải một khu vực làm việc), header sẽ
 * báo sai như thể trang bị 404 dù trang chạy hoàn toàn bình thường. Khai báo
 * nhãn ở đây để header hiển thị đúng mà KHÔNG thêm mục mới vào sidebar.
 */
export const standalonePages = [{ to: '/profile', label: 'Hồ sơ cá nhân', end: true }]

export default navigation

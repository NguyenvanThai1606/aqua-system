import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import AuthProvider from './components/AuthProvider'
import ThemeProvider from './components/ThemeProvider'
import ToastProvider from './components/ToastProvider'
import NotificationsProvider from './components/NotificationsProvider'
import TasksProvider from './components/TasksProvider'
import ProjectsProvider from './components/ProjectsProvider'
import EventsProvider from './components/EventsProvider'
import MessagesProvider from './components/MessagesProvider'
import RequireAuth from './components/auth/RequireAuth'
import RequireAdmin from './components/auth/RequireAdmin'

import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import TasksPage from './pages/TasksPage'
import ProjectsPage from './pages/ProjectsPage'
import NhanSuPage from './pages/NhanSuPage'
import MessagesPage from './pages/MessagesPage'
import CalendarPage from './pages/CalendarPage'
import AttendancePage from './pages/AttendancePage'
import ReportsPage from './pages/ReportsPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <NotificationsProvider>
            <TasksProvider>
              <ProjectsProvider>
                <EventsProvider>
                  <MessagesProvider>
                    <BrowserRouter>
                      <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Toàn bộ khu vực bên dưới yêu cầu đăng nhập. */}
                        <Route element={<RequireAuth />}>
                          <Route element={<AppLayout />}>
                            <Route index element={<DashboardPage />} />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="cong-viec" element={<TasksPage />} />
                            <Route path="du-an" element={<ProjectsPage />} />
                            {/* Phase 10 — module NHÂN SỰ hợp nhất "Nhân viên" +
                                "Cơ cấu tổ chức" cũ vào MỘT route duy nhất, chuyển
                                chế độ xem bằng tab bên trong trang (xem
                                NhanSuPage.jsx). KHÔNG còn route /nhan-vien hay
                                /co-cau-to-chuc riêng. */}
                            <Route path="nhan-su" element={<NhanSuPage />} />
                            <Route path="tin-nhan" element={<MessagesPage />} />
                            <Route path="lich" element={<CalendarPage />} />
                            <Route path="cham-cong" element={<AttendancePage />} />
                            <Route path="bao-cao-kpi" element={<ReportsPage />} />
                            <Route path="thong-bao" element={<NotificationsPage />} />
                            <Route path="cai-dat" element={<SettingsPage />} />

                            {/* Khu vực quản trị — chỉ role 'admin' mới vào được.
                                Truy cập trực tiếp URL này khi không phải admin sẽ
                                bị RequireAdmin redirect về Dashboard ("/"). */}
                            <Route element={<RequireAdmin />}>
                              <Route path="quan-tri/nguoi-dung" element={<AdminUsersPage />} />
                            </Route>

                            <Route path="*" element={<NotFoundPage />} />
                          </Route>
                        </Route>
                      </Routes>
                    </BrowserRouter>
                  </MessagesProvider>
                </EventsProvider>
              </ProjectsProvider>
            </TasksProvider>
          </NotificationsProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

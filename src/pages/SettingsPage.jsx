import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Placeholder from '../components/Placeholder'
import { useTheme } from '../utils/themeContext'
import '../styles/settings.css'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <PageHeader
        icon="settings"
        title="Cài đặt"
        description="Tùy chỉnh giao diện, thông báo và cấu hình chung của hệ thống."
      />

      <div className="settings-stack">
        <Card title="Giao diện">
          <div className="settings-row">
            <div>
              <p className="settings-row-title">Chế độ hiển thị</p>
              <p className="muted">Lựa chọn được ghi nhớ cho lần truy cập sau.</p>
            </div>

            <div className="settings-choices" role="group" aria-label="Chế độ hiển thị">
              {[
                { value: 'light', label: 'Sáng' },
                { value: 'dark', label: 'Tối' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`settings-choice${
                    theme === option.value ? ' settings-choice-active' : ''
                  }`}
                  onClick={() => setTheme(option.value)}
                  aria-pressed={theme === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <Placeholder
            icon="settings"
            title="Cấu hình hệ thống"
            description="Các nhóm thiết lập còn lại sẽ bổ sung ở giai đoạn sau."
            features={[
              'Thông tin công ty và múi giờ làm việc',
              'Phân quyền theo vai trò người dùng',
              'Quy tắc thông báo cho từng loại sự kiện',
              'Ngày nghỉ lễ và ca làm việc',
            ]}
          />
        </Card>
      </div>
    </>
  )
}

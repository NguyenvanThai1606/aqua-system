import Icon from './Icon'
import { useTheme } from '../utils/themeContext'

/** Nút bật/tắt chế độ tối. */
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggleTheme}
      title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      aria-pressed={isDark}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={19} />
    </button>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import useMediaQuery from '../utils/useMediaQuery'
import { readStorage, writeStorage } from '../utils/storage'
import '../styles/layout.css'

const STORAGE_KEY = 'aqua:sidebar-collapsed'

export default function AppLayout() {
  // Dưới 1024px sidebar hoạt động như ngăn kéo trượt ra.
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, setCollapsed] = useState(() => readStorage(STORAGE_KEY) === '1')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const mainRef = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => {
    writeStorage(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // Đổi trang: đóng ngăn kéo và cuộn nội dung lên đầu.
  useEffect(() => {
    setDrawerOpen(false)
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  // Chuyển sang desktop thì ngăn kéo không còn ý nghĩa.
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false)
  }, [isDesktop])

  // Escape để đóng ngăn kéo.
  useEffect(() => {
    if (!drawerOpen) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  const toggleSidebar = () => {
    if (isDesktop) setCollapsed((value) => !value)
    else setDrawerOpen((value) => !value)
  }

  return (
    <div className={`app-shell${isDesktop && collapsed ? ' app-shell-collapsed' : ''}`}>
      <Sidebar
        collapsed={isDesktop && collapsed}
        open={drawerOpen}
        onNavigate={() => setDrawerOpen(false)}
      />

      {drawerOpen && (
        <button
          type="button"
          className="app-scrim"
          onClick={() => setDrawerOpen(false)}
          aria-label="Đóng thanh điều hướng"
        />
      )}

      <div className="app-main">
        <Header onToggleSidebar={toggleSidebar} />

        <main className="app-content" ref={mainRef}>
          <div className="app-content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

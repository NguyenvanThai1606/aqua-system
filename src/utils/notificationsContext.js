import { createContext, useContext } from 'react'

export const NotificationsContext = createContext(null)

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications phải được dùng bên trong <NotificationsProvider>.')
  }
  return context
}

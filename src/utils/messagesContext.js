import { createContext, useContext } from 'react'

export const MessagesContext = createContext(null)

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context) {
    throw new Error('useMessages phải được dùng bên trong <MessagesProvider>.')
  }
  return context
}

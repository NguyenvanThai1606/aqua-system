import { createContext, useContext } from 'react'

export const EventsContext = createContext(null)

export function useEvents() {
  const context = useContext(EventsContext)
  if (!context) {
    throw new Error('useEvents phải được dùng bên trong <EventsProvider>.')
  }
  return context
}

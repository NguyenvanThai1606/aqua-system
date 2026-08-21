import { createContext, useContext } from 'react'

export const ThemeContext = createContext(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme phải được dùng bên trong <ThemeProvider>.')
  }
  return context
}

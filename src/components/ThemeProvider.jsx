import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '../utils/themeContext'
import { readStorage, writeStorage } from '../utils/storage'

const STORAGE_KEY = 'aqua:theme'

function getInitialTheme() {
  const saved = readStorage(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    writeStorage(STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme: () =>
        setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

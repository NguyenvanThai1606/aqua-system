import { createContext, useContext } from 'react'

export const ProjectsContext = createContext(null)

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error('useProjects phải được dùng bên trong <ProjectsProvider>.')
  }
  return context
}

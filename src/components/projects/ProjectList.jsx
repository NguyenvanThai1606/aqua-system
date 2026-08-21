import ProjectCard from './ProjectCard'

/** Lưới thẻ dự án — danh sách đã được lọc và sắp xếp từ trước. */
export default function ProjectList({ projects, onOpenProject }) {
  return (
    <div className="project-list">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
      ))}
    </div>
  )
}

import type { PortfolioProject } from '../data/projects';
import { assetPath } from '../utils/assetPath';

export function WorkGrid({ projects }: { projects: PortfolioProject[] }) {
  return (
    <div className="work-grid">
      {projects.map((project, index) => {
        const description = project.description ?? project.role ?? 'Portfolio project imported from ArtStation.';
        const href = `#/projects/${project.slug ?? project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

        return (
          <article className="work-card" key={project.slug ?? `${project.title}-${index}`}>
            <a className="work-card__media scanline-image" href={href} aria-describedby={`project-desc-${index}`}>
              <img src={assetPath(project.cover)} alt={`${project.title} artwork`} loading="lazy" />
            </a>
            <div className="work-card__copy">
              <span>_{String(index + 1).padStart(2, '0')}</span>
              <h3>{project.title}</h3>
              <small>{project.tags?.slice(0, 3).join(' / ')}</small>
            </div>
            <aside className="work-card__popup" id={`project-desc-${index}`}>
              <span>$ cat ./project-summary.txt</span>
              <p>{description}</p>
            </aside>
          </article>
        );
      })}
    </div>
  );
}

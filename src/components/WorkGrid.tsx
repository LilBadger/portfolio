import type { PortfolioProject } from '../data/projects';
import { assetPath } from '../utils/assetPath';
import { projectHref } from '../utils/routes';
import { imagePresentation } from '../utils/imagePreview';

export function WorkGrid({ projects }: { projects: PortfolioProject[] }) {
  const currentProjects = projects.slice(0, 2);
  const archiveProjects = projects.slice(2);

  const renderProject = (project: PortfolioProject, index: number, featured: boolean) => {
    const description = project.description ?? project.role ?? 'Portfolio project imported from ArtStation.';
    const slug = project.slug ?? project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const href = projectHref(slug);
    const cover = imagePresentation(project.cover);

    return (
      <article className={`work-card${featured ? ' work-card--featured' : ''}`} key={project.slug ?? `${project.title}-${index}`}>
        <a className="work-card__media scanline-image" href={href} aria-describedby={`project-desc-${index}`}>
          <img src={assetPath(cover.src)} alt={`${project.title} artwork`} loading="lazy" width={cover.width} height={cover.height} />
        </a>
        <a className="work-card__copy" href={href} aria-describedby={`project-desc-${index}`}>
          <span>_{String(index + 1).padStart(2, '0')}</span>
          <h3>{project.title}</h3>
          <small>{project.tags?.slice(0, 3).join(' / ')}</small>
        </a>
        <aside className="work-card__popup" id={`project-desc-${index}`}>
          <span>$ cat ./project-summary.txt</span>
          <p>{description}</p>
        </aside>
      </article>
    );
  };

  return (
    <div className="work-archive">
      <div className="work-tier-heading">
        <p>_CURRENT TRANSMISSIONS</p>
        <small>RECENT / FEATURED</small>
      </div>
      <div className="work-grid work-grid--current">
        {currentProjects.map((project, index) => renderProject(project, index, true))}
      </div>

      {archiveProjects.length > 0 ? (
        <>
          <div className="work-tier-heading work-tier-heading--archive">
            <p>_ARCHIVE INDEX</p>
            <small>SELECTED WORK / 03-{String(projects.length).padStart(2, '0')}</small>
          </div>
          <div className="work-grid work-grid--archive">
            {archiveProjects.map((project, index) => renderProject(project, index + currentProjects.length, false))}
          </div>
        </>
      ) : null}
    </div>
  );
}

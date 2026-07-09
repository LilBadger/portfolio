import { useState } from 'react';
import { AsciiBunny } from './AsciiBunny';
import type { PortfolioProject } from '../data/projects';
import { assetPath } from '../utils/assetPath';
import { ContentRenderer } from './ContentRenderer';
import { homeHref, homeSectionHref } from '../utils/routes';
import { imagePresentation } from '../utils/imagePreview';

type ProjectVideoData = NonNullable<PortfolioProject['videos']>[number];

function ProjectVideo({ projectTitle, video, index }: { projectTitle: string; video: ProjectVideoData; index: number }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const isLocal = /\.(mp4|webm|mov)(\?|#|$)/i.test(video.url) || video.url.startsWith('assets/');
  const title = video.title ?? `${projectTitle} video ${index + 1}`;

  return (
    <article className="project-video">
      {isLocal && !isLoaded ? (
        <button className="project-video__poster" type="button" onClick={() => setIsLoaded(true)} aria-label={`Play ${title}`}>
          {video.poster ? <img src={assetPath(video.poster)} alt="" loading="lazy" /> : null}
          <span>PLAY VIDEO</span>
        </button>
      ) : isLocal ? (
        <video
          src={assetPath(video.url)}
          poster={video.poster ? assetPath(video.poster) : undefined}
          controls
          autoPlay
          preload="metadata"
        />
      ) : (
        <iframe
          src={video.url}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
      <a href={isLocal ? assetPath(video.url) : video.url} target="_blank" rel="noreferrer">
        {video.title ?? `Open ${video.platform ?? 'video'} source`}
      </a>
    </article>
  );
}

export function ProjectDetailPage({ project }: { project: PortfolioProject }) {
  const [isTextHidden, setIsTextHidden] = useState(false);
  const gallery = project.gallery?.length ? project.gallery : [project.cover];
  const videos = project.videos ?? [];
  const meta = [project.year, project.role, ...(project.tags ?? []).slice(0, 5)].filter(Boolean);
  const body = Array.isArray(project.body) ? project.body.join('\n') : project.body;
  const isArticleLayout = project.layout === 'article';

  return (
    <article className={`content-page project-detail-page${isArticleLayout ? ' project-detail-page--article' : ''}${isTextHidden ? ' project-detail-page--text-hidden' : ''}`}>
      <nav className="content-nav" aria-label="Project navigation">
        <a href={homeHref}>&lt; HOME</a>
        <a href={homeSectionHref('work')}>WORK</a>
        {project.sourceUrl ? (
          <a href={project.sourceUrl} target="_blank" rel="noreferrer">{project.sourceLabel ?? 'ARTSTATION'}</a>
        ) : null}
      </nav>

      <div className="project-view-tools" aria-label="Project view controls">
        <button type="button" aria-pressed={isTextHidden} onClick={() => setIsTextHidden((current) => !current)}>
          {isTextHidden ? 'SHOW TEXT' : 'HIDE TEXT'}
        </button>
        {project.sourceUrl ? (
          <a href={project.sourceUrl} target="_blank" rel="noreferrer">
            OPEN {project.sourceLabel ?? 'SOURCE'}
          </a>
        ) : null}
      </div>

      <header className="content-hero project-detail-hero">
        <p className="eyebrow">_PROJECT DOSSIER</p>
        <div className="project-title-shell">
          <pre className="project-title-shell__terminal" aria-hidden="true">
            {[
              '$ nmap -sV portfolio.local',
              '$ hydra -l guest -P /dev/null project-vault',
              '$ ./crack_manifest --target ./assets/artstation',
              '$ strings ./gallery.bundle | grep sourceUrl',
              '$ openssl dgst -sha256 final_render.jpg',
              '$ rsync --dry-run ./project_files ./client_preview',
              '$ access denied: read-only dossier',
              '$ retry --public-mirror --no-auth'
            ].join('\n')}
          </pre>
          <h1>{project.title}</h1>
        </div>
        <p className="content-hero__meta">{meta.join(' / ')}</p>
        {project.description ? <p className="content-hero__excerpt">{project.description}</p> : null}
      </header>

      {videos.length > 0 ? (
        <section className="project-videos" aria-label={`${project.title} videos`}>
          <p className="eyebrow">_VIDEO SIGNALS</p>
          <div className={`project-video-grid${videos.length === 1 ? ' project-video-grid--single' : ''}`}>
            {videos.map((video, index) => (
              <ProjectVideo projectTitle={project.title} video={video} index={index} key={`${video.url}-${index}`} />
            ))}
          </div>
        </section>
      ) : null}

      {!isArticleLayout ? (
        <section className="project-gallery" aria-label={`${project.title} gallery`}>
          {gallery.map((image, index) => {
            const presentation = imagePresentation(image);
            return (
              <figure className="content-image scanline-image" key={`${image}-${index}`}>
                {index === 0 ? <AsciiBunny variant="project" /> : null}
                <a className="project-gallery__image-link" href={assetPath(image)} target="_blank" rel="noreferrer" aria-label={`Open ${project.title} artwork ${index + 1} full resolution`}>
                  <img src={assetPath(presentation.src)} alt={`${project.title} artwork ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} width={presentation.width} height={presentation.height} />
                  <span>OPEN FULL RESOLUTION</span>
                </a>
              </figure>
            );
          })}
        </section>
      ) : null}

      {body ? (
        <section className="project-breakdown" aria-label={`${project.title} breakdown`}>
          {project.slug === 'fugi-visualizer' ? (
            <div className="f1r-love-bunny-field" aria-hidden="true">
              <AsciiBunny variant="love" />
            </div>
          ) : null}
          <ContentRenderer body={body} />
        </section>
      ) : null}
    </article>
  );
}

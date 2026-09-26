import { useState } from 'react';
import { AsciiBunny } from './AsciiBunny';
import type { PortfolioProject } from '../data/projects';
import { assetPath } from '../utils/assetPath';
import { ContentRenderer, extractContentHeadings, extractContentImages } from './ContentRenderer';
import { homeHref, homeSectionHref, projectHref } from '../utils/routes';
import { imagePresentation } from '../utils/imagePreview';
import { ProjectContentsNav, type ProjectContentsItem } from './ProjectContentsNav';
import { ImageViewer, type ViewerImage } from './ImageViewer';
import { BreakdownSlider } from './BreakdownSlider';
import { useReveal } from '../hooks/useReveal';
import { ProjectThumb } from './ProjectThumb';
import { viewTransitionName } from '../utils/projectMedia';

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

export function ProjectDetailPage({
  project,
  previousProject,
  nextProject
}: {
  project: PortfolioProject;
  previousProject?: PortfolioProject;
  nextProject?: PortfolioProject;
}) {
  const [isTextHidden, setIsTextHidden] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const gallery = project.gallery?.length ? project.gallery : [project.cover];
  const videos = project.videos ?? [];
  // Role and tags overlap ("ANIMATION / RENDERING" in both), so split and dedupe case-insensitively.
  const meta = [...new Map(
    [project.year, ...(project.role ?? '').split('/'), ...(project.tags ?? [])]
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item))
      .map((item) => [item.toLowerCase(), item] as const)
  ).values()].slice(0, 8);
  const slug = project.slug ?? '';
  useReveal(slug);
  const terminalLines = [
    `$ cd ./projects/${slug}`,
    ...(project.tools ?? []).slice(0, 4).map((tool) => `$ launch ${tool.toLowerCase().replace(/[^a-z0-9.+]+/g, '-')}`),
    '$ render --final --aov beauty,depth',
    '$ status: delivered \u2713'
  ];
  const body = Array.isArray(project.body) ? project.body.join('\n') : project.body;
  const isArticleLayout = project.layout === 'article';
  const contentImages = body ? extractContentImages(body) : [];
  const viewerImages: ViewerImage[] = [
    ...(isArticleLayout ? [] : gallery.map((src, index) => ({ src, alt: `${project.title} artwork ${index + 1}` }))),
    ...contentImages.map((item, index) => ({
      src: item.src,
      alt: item.alt || `${project.title} process image ${index + 1}`
    }))
  ];
  const contents: ProjectContentsItem[] = project.contents ?? (body
    ? extractContentHeadings(body)
      .filter((heading) => heading.level === 2)
      .slice(0, 4)
      .map((heading) => ({ label: heading.text.toUpperCase(), target: heading.id }))
    : []);
  const openImage = (src: string) => {
    const index = viewerImages.findIndex((item) => item.src === src);
    if (index >= 0) setActiveImageIndex(index);
  };

  return (
    <article className={`content-page project-detail-page${isArticleLayout ? ' project-detail-page--article' : ''}${isTextHidden ? ' project-detail-page--text-hidden' : ''}`}>
      <nav className="content-nav" aria-label="Project navigation">
        <a href={homeHref}>&lt; HOME</a>
        <a href={homeSectionHref('work')}>WORK</a>
        {project.sourceUrl ? (
          <a href={project.sourceUrl} target="_blank" rel="noreferrer">{project.sourceLabel ?? 'ARTSTATION'}</a>
        ) : null}
      </nav>

      <div className="project-utility-rail">
        <div className="project-view-tools" aria-label="Project view controls">
          <button type="button" aria-pressed={isTextHidden} onClick={() => setIsTextHidden((current) => !current)}>
            {isTextHidden ? 'SHOW TEXT' : 'HIDE TEXT'}
          </button>
          {project.sourceUrl ? (
            <a href={project.sourceUrl} target="_blank" rel="noreferrer">
              OPEN {project.sourceLabel ?? (project.sourceUrl.includes('artstation') ? 'ARTSTATION' : 'SOURCE')}
            </a>
          ) : null}
        </div>
        <ProjectContentsNav items={contents} />
      </div>

      <div className="project-cover" style={{ viewTransitionName: viewTransitionName(slug) }}>
        <ProjectThumb slug={slug} alt="" sizes="100vw" eager />
      </div>

      <header className="content-hero project-detail-hero">
        <p className="eyebrow">_PROJECT DOSSIER</p>
        <div className="project-title-shell">
          <pre className="project-title-shell__terminal" aria-hidden="true">
            {terminalLines.join('\n')}
          </pre>
          <h1>{project.title}</h1>
        </div>
        <p className="content-hero__meta">{meta.join(' / ')}</p>
        {project.description ? <p className="content-hero__excerpt">{project.description}</p> : null}
      </header>

      {videos.length > 0 ? (
        <section className="project-videos" aria-label={`${project.title} videos`}>
          <p className="eyebrow">_VIDEO SIGNALS</p>
          <div className="project-video-stage">
            {project.slug === 'night-of-the-living-dead-ltx-contest' ? <AsciiBunny variant="zombie" /> : null}
            <div className={`project-video-grid${videos.length === 1 ? ' project-video-grid--single' : ''}`}>
              {videos.map((video, index) => (
                <ProjectVideo projectTitle={project.title} video={video} index={index} key={`${video.url}-${index}`} />
              ))}
            </div>
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
                <button className="project-gallery__image-link" type="button" aria-haspopup="dialog" aria-label={`Inspect ${project.title} artwork ${index + 1} full resolution`} onClick={() => openImage(image)}>
                  <img src={assetPath(presentation.src)} alt={`${project.title} artwork ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} width={presentation.width} height={presentation.height} />
                  <span>INSPECT FULL RESOLUTION</span>
                </button>
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
          {project.breakdown?.length ? <BreakdownSlider pairs={project.breakdown} title={project.title} /> : null}
          <ContentRenderer body={body} onImageOpen={openImage} />
        </section>
      ) : null}

      {previousProject && nextProject ? (
        <footer className="project-exit-nav" aria-label="More projects">
          <a className="project-exit-nav__previous" href={projectHref(previousProject.slug ?? '')}>
            <span>&larr; PREVIOUS PROJECT</span>
            <strong>{previousProject.title}</strong>
          </a>
          <a className="project-exit-nav__archive" href={homeSectionHref('work')}>WORK ARCHIVE</a>
          <a className="project-exit-nav__next" href={projectHref(nextProject.slug ?? '')}>
            <span>NEXT PROJECT &rarr;</span>
            <strong>{nextProject.title}</strong>
          </a>
        </footer>
      ) : null}

      <ImageViewer
        images={viewerImages}
        activeIndex={activeImageIndex}
        onClose={() => setActiveImageIndex(null)}
        onIndexChange={setActiveImageIndex}
      />
    </article>
  );
}

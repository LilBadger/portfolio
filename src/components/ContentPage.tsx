import { useState } from 'react';
import type { ContentDocument } from '../data/content';
import { assetPath } from '../utils/assetPath';
import { ContentRenderer, extractContentImages } from './ContentRenderer';
import { homeHref, homeSectionHref } from '../utils/routes';
import { imagePresentation } from '../utils/imagePreview';
import { ImageViewer, type ViewerImage } from './ImageViewer';

export function ContentPage({ document }: { document: ContentDocument }) {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const cover = document.cover ? imagePresentation(document.cover) : undefined;
  const viewerImages: ViewerImage[] = [
    ...(document.cover ? [{ src: document.cover, alt: `${document.title} cover` }] : []),
    ...extractContentImages(document.body).map((item, index) => ({
      src: item.src,
      alt: item.alt || `${document.title} image ${index + 1}`
    }))
  ];
  const openImage = (src: string) => {
    const index = viewerImages.findIndex((item) => item.src === src);
    if (index >= 0) setActiveImageIndex(index);
  };
  const terminalLines = document.kind === 'article'
    ? [
      '$ cat ./field-note.md',
      '$ grep -R "process" ./case-study',
      '$ ffprobe ./breakdown_cut.mp4',
      '$ render --notes --client-safe',
      '$ sync ./wip ./published_archive'
    ]
    : [
      '$ whoami',
      '$ cat ./artist-profile.txt',
      '$ ls -lah ./public_channels',
      '$ grep -R "availability" ./contact',
      '$ status: public dossier loaded'
    ];
  const shouldShowExcerpt = document.kind === 'article' && document.excerpt;

  return (
    <article className={`content-page content-page--${document.kind}`}>
      <nav className="content-nav" aria-label="Content navigation">
        <a href={homeHref}>&lt; HOME</a>
        {document.kind === 'article' ? <a href={homeSectionHref('articles')}>ARTICLES</a> : null}
        <a href={homeSectionHref('work')}>WORK</a>
      </nav>

      <header className={`content-hero content-dossier-hero content-dossier-hero--${document.kind}`}>
        <p className="eyebrow">_{document.kind === 'article' ? 'ARTICLE DOSSIER' : 'PAGE DOSSIER'}</p>
        <div className="project-title-shell content-title-shell">
          <pre className="project-title-shell__terminal" aria-hidden="true">
            {terminalLines.join('\n')}
          </pre>
          <h1>{document.title}</h1>
        </div>
        <p className="content-hero__meta">
          {[document.date, ...document.tags].filter(Boolean).join(' / ')}
        </p>
        {shouldShowExcerpt ? <p className="content-hero__excerpt">{document.excerpt}</p> : null}
        {document.cover && cover ? (
          <figure className="content-hero__cover scanline-image">
            <button className="content-hero__cover-button" type="button" aria-haspopup="dialog" aria-label={`Inspect ${document.title} cover full resolution`} onClick={() => openImage(document.cover!)}>
              <img src={assetPath(cover.src)} alt="" loading="eager" width={cover.width} height={cover.height} />
              <span>INSPECT FULL RESOLUTION</span>
            </button>
          </figure>
        ) : null}
      </header>

      <ContentRenderer body={document.body} onImageOpen={openImage} />
      <ImageViewer
        images={viewerImages}
        activeIndex={activeImageIndex}
        onClose={() => setActiveImageIndex(null)}
        onIndexChange={setActiveImageIndex}
      />
    </article>
  );
}

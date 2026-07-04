import type { ContentDocument } from '../data/content';
import { assetPath } from '../utils/assetPath';
import { ContentRenderer } from './ContentRenderer';

export function ContentPage({ document }: { document: ContentDocument }) {
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
        <a href="#/">&lt; HOME</a>
        {document.kind === 'article' ? <a href="#articles">ARTICLES</a> : null}
        <a href="#work">WORK</a>
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
        {document.cover ? (
          <figure className="content-hero__cover scanline-image">
            <img src={assetPath(document.cover)} alt="" loading="eager" />
          </figure>
        ) : null}
      </header>

      <ContentRenderer body={document.body} />
    </article>
  );
}

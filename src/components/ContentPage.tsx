import type { ContentDocument } from '../data/content';
import { assetPath } from '../utils/assetPath';
import { ContentRenderer } from './ContentRenderer';

export function ContentPage({ document }: { document: ContentDocument }) {
  return (
    <article className={`content-page content-page--${document.kind}`}>
      <nav className="content-nav" aria-label="Content navigation">
        <a href="#/">&lt; HOME</a>
        {document.kind === 'article' ? <a href="#articles">ARTICLES</a> : null}
        <a href="#work">WORK</a>
      </nav>

      <header className="content-hero">
        <p className="eyebrow">_{document.kind === 'article' ? 'ARTICLE' : 'PAGE'}</p>
        <h1>{document.title}</h1>
        <p className="content-hero__meta">
          {[document.date, ...document.tags].filter(Boolean).join(' / ')}
        </p>
        {document.excerpt ? <p className="content-hero__excerpt">{document.excerpt}</p> : null}
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

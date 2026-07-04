import type { ContentDocument } from '../data/content';
import { assetPath } from '../utils/assetPath';

export function ArticleCard({ article, index }: { article: ContentDocument; index: number }) {
  return (
    <article className="article-list-card">
      <a className="article-list-card__media scanline-image" href={article.href} aria-label={`Read ${article.title}`}>
        <img src={assetPath(article.cover)} alt="" loading="lazy" />
      </a>
      <div className="article-list-card__copy">
        <p className="eyebrow">_ARTICLE {String(index + 1).padStart(2, '0')}</p>
        <h3><a href={article.href}>{article.title}</a></h3>
        <p>{article.excerpt ?? 'Process article.'}</p>
        <small>{[article.date, ...article.tags.slice(0, 3)].filter(Boolean).join(' / ')}</small>
      </div>
    </article>
  );
}

import type { ContentDocument } from '../data/content';
import { ArticleCard } from './ArticleCard';

export function ArticleIndex({ articles }: { articles: ContentDocument[] }) {
  if (articles.length === 0) return null;

  return (
    <div className="article-grid">
      {articles.map((article, index) => <ArticleCard article={article} index={index} key={article.slug} />)}
    </div>
  );
}

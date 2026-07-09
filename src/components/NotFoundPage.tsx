import { homeHref, homeSectionHref } from '../utils/routes';

export function NotFoundPage() {
  return (
    <section className="content-page content-page--missing" aria-labelledby="missing-title">
      <nav className="content-nav" aria-label="Content navigation">
        <a href={homeHref}>&lt; HOME</a>
        <a href={homeSectionHref('work')}>WORK</a>
      </nav>
      <header className="content-hero">
        <p className="eyebrow">_404</p>
        <h1 id="missing-title">SIGNAL LOST</h1>
        <p className="content-hero__excerpt">That article or page is not published, missing, or still marked as draft.</p>
      </header>
    </section>
  );
}

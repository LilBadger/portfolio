import { useEffect, useState, type ReactNode } from 'react';
import { ArticleIndex } from './components/ArticleIndex';
import { AsciiBunny } from './components/AsciiBunny';
import { ContentPage } from './components/ContentPage';
import { GlitchText } from './components/GlitchText';
import { HeroTerminalLine } from './components/HeroTerminalLine';
import { NotFoundPage } from './components/NotFoundPage';
import { ProjectDetailPage } from './components/ProjectDetailPage';
import { WorkGrid } from './components/WorkGrid';
import { articles, featuredArticle, getArticle, getPage, pages } from './data/content';
import { getProject, projects } from './data/projects';

type Route =
  | { type: 'home' }
  | { type: 'article'; slug: string }
  | { type: 'page'; slug: string }
  | { type: 'project'; slug: string };

type ActiveBunny = 'hero' | 'work';

const navLinks = [
  { href: '#work', label: 'Work' },
  { href: '#process', label: 'Process' },
  { href: '#articles', label: 'Articles' },
  { href: '#/pages/about', label: 'About' },
  { href: '#contact', label: 'Contact' }
];

const socialLinks = [
  { href: 'https://x.com/Badgerz', label: 'X', icon: 'X' },
  { href: 'https://www.instagram.com/_vladski_/', label: 'Instagram', icon: 'IG' },
  { href: 'https://www.linkedin.com/in/vladmaftei/', label: 'LinkedIn', icon: 'in' },
  { href: 'https://vladmaftei.artstation.com/', label: 'ArtStation', icon: 'AS' },
  { href: 'mailto:vladmaftei@gmail.com', label: 'Email', icon: '@' }
];

function parseHashRoute(hash: string): Route {
  const cleaned = hash.replace(/^#\/?/, '').replace(/^\//, '');
  if (cleaned.startsWith('articles/')) return { type: 'article', slug: cleaned.replace('articles/', '') };
  if (cleaned.startsWith('pages/')) return { type: 'page', slug: cleaned.replace('pages/', '') };
  if (cleaned.startsWith('projects/')) return { type: 'project', slug: cleaned.replace('projects/', '') };
  return { type: 'home' };
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHashRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}

function SiteNav() {
  return (
    <header className="site-nav">
      <a className="site-nav__brand" href="#/">
        <span>VLAD MAFTEI</span>
        <small><b>VFX</b><b>/</b><b>3D</b><b>/</b><b>AI</b></small>
      </a>
      <nav aria-label="Main navigation">
        {navLinks.map((link) => <a href={link.href} key={link.href}>{link.label}</a>)}
      </nav>
    </header>
  );
}

function SectionHeader({
  eyebrow,
  titleId,
  title,
  children
}: {
  eyebrow: string;
  titleId: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-header">
      <p className="eyebrow">_{eyebrow}</p>
      <h2 id={titleId}>{title}</h2>
      {children ? <div className="section-header__copy">{children}</div> : null}
    </div>
  );
}

function useActiveHomeBunny(): ActiveBunny {
  const [activeBunny, setActiveBunny] = useState<ActiveBunny>('hero');

  useEffect(() => {
    let frame = 0;

    const updateActiveBunny = () => {
      frame = 0;
      const workSection = document.querySelector<HTMLElement>('#work');
      if (!workSection) return;

      const workBounds = workSection.getBoundingClientRect();
      const workIsFocus = workBounds.top <= window.innerHeight * 0.28
        && workBounds.bottom >= window.innerHeight * 0.2;

      setActiveBunny(workIsFocus ? 'work' : 'hero');
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveBunny);
    };

    updateActiveBunny();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  return activeBunny;
}

function HomePage() {
  const activeBunny = useActiveHomeBunny();
  const contactLinks = [
    { href: 'mailto:vladmaftei@gmail.com', label: 'Email', value: 'vladmaftei@gmail.com' },
    { href: 'https://vladmaftei.artstation.com/', label: 'ArtStation', value: 'vladmaftei.artstation.com' },
    { href: 'https://www.linkedin.com/in/vladmaftei/', label: 'LinkedIn', value: 'linkedin.com/in/vladmaftei' },
    { href: 'https://www.instagram.com/_vladski_/', label: 'Instagram', value: '@_vladski_' },
    { href: 'https://x.com/Badgerz', label: 'X', value: '@Badgerz' }
  ];

  return (
    <>
      <SiteNav />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-identity">
          <p className="eyebrow">_ARTIST DOSSIER</p>
          <h1 id="hero-title">
            <GlitchText text="VLAD" as="span" className="hero-name-line hero-name-line--vlad" intensity="heavy" />
            <GlitchText text="MAFTEI" as="span" className="hero-name-line" intensity="heavy" />
          </h1>
          <p className="role-line">VFX <span>/</span> 3D <span>/</span> AI</p>
          <p className="hero-summary">
            Cinematic visual work across 3D, procedural systems, product imagery, character experiments,
            and AI-assisted image/video workflows.
          </p>
          <HeroTerminalLine />
          <div className="hero-actions">
            <a className="enter-link" href="#work">&gt; VIEW WORK_</a>
            <a className="secondary-link" href="#process">PROCESS</a>
            <div className="hero-socials" aria-label="Social links">
              {socialLinks.map((link) => (
                <a href={link.href} aria-label={link.label} key={link.label} rel="noreferrer" target={link.href.startsWith('mailto:') ? undefined : '_blank'}>
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        {activeBunny === 'hero' ? <AsciiBunny key="hero-bunny" /> : null}
      </section>

      <section id="work" className="work-section" aria-labelledby="work-title">
        {activeBunny === 'work' ? <AsciiBunny key="work-bunny" variant="work" /> : null}
        <div className="work-terminal-header">
          <p className="eyebrow">_WORK ARCHIVE</p>
        </div>
        <h2 id="work-title" className="visually-hidden">Selected Projects</h2>
        <WorkGrid projects={projects} />
      </section>

      <section id="process" className="process-section" aria-labelledby="process-title">
        <SectionHeader eyebrow="PROCESS" titleId="process-title" title="Pipeline Notes">
          <p>
            Clear breakdowns of concept, asset build, procedural work, render,
            AI exploration, and final grade.
          </p>
        </SectionHeader>
        <div className="process-grid">
          {['Concept / Reference', 'Asset / Lookdev', 'Simulation / Motion', 'Render / Delivery'].map((item, index) => (
            <article className="process-card" key={item}>
              <span>_{String(index + 1).padStart(2, '0')}</span>
              <h3>{item}</h3>
            </article>
          ))}
        </div>
      </section>

      <section id="articles" className="articles-section" aria-labelledby="articles-title">
        <SectionHeader eyebrow="ARTICLES / CASE STUDIES" titleId="articles-title" title="Field Notes">
          <p>
            {featuredArticle ? (
              <>Current featured note: <a href={featuredArticle.href}>{featuredArticle.title}</a>.</>
            ) : 'Published breakdowns and process notes will appear here.'}
          </p>
        </SectionHeader>
        <ArticleIndex articles={articles} />
      </section>

      <section id="about" className="pages-section" aria-labelledby="about-title">
        <SectionHeader eyebrow="ABOUT" titleId="about-title" title="Artist Profile">
          <p>
            I work as a 3D generalist across VFX, product imagery, character experiments,
            procedural motion, and AI-assisted image/video workflows.
          </p>
        </SectionHeader>
        {pages.length > 0 ? (
          <div className="page-link-grid">
            {pages.map((page) => (
              <a className="page-link-card" href={page.href} key={page.slug}>
                <span>_{page.title}</span>
                <p>{page.excerpt ?? 'Open page.'}</p>
              </a>
            ))}
          </div>
        ) : null}
      </section>

      <section id="contact" className="contact-section" aria-labelledby="contact-title">
        <SectionHeader eyebrow="CONTACT" titleId="contact-title" title="Commission / Collaboration Signal">
          <p>
            For commissions, collaborations, project breakdowns, or availability,
            email me directly or use one of the public channels below.
          </p>
        </SectionHeader>
        <div className="contact-links" aria-label="Contact and social links">
          {contactLinks.map((link) => (
            <a className="contact-link" href={link.href} key={link.label} rel="noreferrer" target={link.href.startsWith('mailto:') ? undefined : '_blank'}>
              <span>{link.label}</span>
              <strong>{link.value}</strong>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

export function App() {
  const route = useHashRoute();
  const article = route.type === 'article' ? getArticle(route.slug) : undefined;
  const page = route.type === 'page' ? getPage(route.slug) : undefined;
  const project = route.type === 'project' ? getProject(route.slug) : undefined;

  return (
    <main className="site-shell">
      <div className="crt-overlay" aria-hidden="true" />
      {route.type === 'article' && article ? <ContentPage document={article} /> : null}
      {route.type === 'page' && page ? <ContentPage document={page} /> : null}
      {route.type === 'project' && project ? <ProjectDetailPage project={project} /> : null}
      {route.type === 'home' ? <HomePage /> : null}
      {((route.type === 'article' && !article) || (route.type === 'page' && !page) || (route.type === 'project' && !project)) ? <NotFoundPage /> : null}
    </main>
  );
}

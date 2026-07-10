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
import { assetPath } from './utils/assetPath';
import { articleHref, homeHref, homeSectionHref, pageHref, pathWithoutBase, projectHref } from './utils/routes';

type Route =
  | { type: 'home'; section?: HomeSection }
  | { type: 'article'; slug: string }
  | { type: 'page'; slug: string }
  | { type: 'project'; slug: string };

type ActiveBunny = 'hero' | 'work';
type HomeSection = 'work' | 'process' | 'articles' | 'about' | 'contact';

const homeSections: HomeSection[] = ['work', 'process', 'articles', 'about', 'contact'];

const navLinks: Array<{ href: string; label: string; section: HomeSection }> = [
  { href: homeSectionHref('work'), label: 'Work', section: 'work' },
  { href: homeSectionHref('process'), label: 'Process', section: 'process' },
  ...(articles.length > 0 ? [{ href: homeSectionHref('articles'), label: 'Articles', section: 'articles' as HomeSection }] : []),
  { href: pageHref('about'), label: 'About', section: 'about' },
  { href: homeSectionHref('contact'), label: 'Contact', section: 'contact' }
];

const socialLinks = [
  { href: 'https://x.com/Badgerz', label: 'X', icon: 'X' },
  { href: 'https://www.instagram.com/_vladski_/', label: 'Instagram', icon: 'IG' },
  { href: 'https://www.linkedin.com/in/vladmaftei/', label: 'LinkedIn', icon: 'in' },
  { href: 'https://vladmaftei.artstation.com/', label: 'ArtStation', icon: 'AS' },
  { href: 'mailto:vladmaftei@gmail.com', label: 'Email', icon: '@' }
];

function parseRouteValue(cleaned: string): Route {
  if (cleaned.startsWith('articles/')) return { type: 'article', slug: cleaned.replace('articles/', '') };
  if (cleaned.startsWith('pages/')) return { type: 'page', slug: cleaned.replace('pages/', '') };
  if (cleaned.startsWith('projects/')) return { type: 'project', slug: cleaned.replace('projects/', '') };
  const section = homeSections.find((candidate) => candidate === cleaned);
  return { type: 'home', section };
}

function parseLocationRoute(): Route {
  const legacyHash = window.location.hash.match(/^#\/(.+)/);
  if (legacyHash) return parseRouteValue(legacyHash[1].replace(/^\/+|\/+$/g, ''));

  const pathRoute = parseRouteValue(pathWithoutBase(window.location.pathname));
  if (pathRoute.type !== 'home') return pathRoute;

  const section = window.location.hash.replace(/^#/, '');
  return parseRouteValue(section);
}

function useLocationRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseLocationRoute());

  useEffect(() => {
    const onLocationChange = () => setRoute(parseLocationRoute());
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);

  return route;
}

function useHomeSectionScroll(route: Route) {
  useEffect(() => {
    if (route.type !== 'home') return undefined;

    const frame = window.requestAnimationFrame(() => {
      if (route.section) {
        document.getElementById(route.section)?.scrollIntoView({ block: 'start', behavior: 'auto' });
        return;
      }

      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [route]);
}

type RouteMetadata = {
  title: string;
  description: string;
  image: string;
  canonicalPath: string;
  type: 'website' | 'article';
};

function setMetaContent(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function useRouteMetadata(metadata: RouteMetadata) {
  useEffect(() => {
    const canonicalUrl = new URL(metadata.canonicalPath, window.location.origin).href;
    const imageUrl = new URL(assetPath(metadata.image), window.location.origin).href;
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }

    document.title = metadata.title;
    canonical.href = canonicalUrl;
    setMetaContent('meta[name="description"]', 'name', 'description', metadata.description);
    setMetaContent('meta[property="og:title"]', 'property', 'og:title', metadata.title);
    setMetaContent('meta[property="og:description"]', 'property', 'og:description', metadata.description);
    setMetaContent('meta[property="og:type"]', 'property', 'og:type', metadata.type);
    setMetaContent('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaContent('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMetaContent('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', metadata.title);
    setMetaContent('meta[name="twitter:description"]', 'name', 'twitter:description', metadata.description);
    setMetaContent('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
  }, [metadata]);
}

function SiteNav({ activeSection }: { activeSection?: HomeSection }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className={`site-nav${isMenuOpen ? ' site-nav--open' : ''}`}>
      <a className="site-nav__brand" href={homeHref}>
        <span>VLAD MAFTEI</span>
        <small><b>VFX</b><b>/</b><b>3D</b><b>/</b><b>AI</b></small>
      </a>
      <button className="site-nav__toggle" type="button" aria-label="Toggle navigation" aria-controls="main-navigation" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((current) => !current)}>
        <span />
        <span />
        <span />
      </button>
      <nav aria-label="Main navigation" id="main-navigation">
        {navLinks.map((link) => (
          <a
            className={activeSection === link.section ? 'is-active' : undefined}
            href={link.href}
            aria-current={activeSection === link.section ? 'location' : undefined}
            key={link.href}
            onClick={() => setIsMenuOpen(false)}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function useActiveHomeSection(): HomeSection | undefined {
  const [activeSection, setActiveSection] = useState<HomeSection>();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const activationLine = Math.min(window.innerHeight * 0.34, 300);
      let current: HomeSection | undefined;

      for (const section of homeSections) {
        const element = document.getElementById(section);
        const bounds = element?.getBoundingClientRect();
        if (bounds && bounds.top <= activationLine && bounds.bottom > activationLine) current = section;
      }

      setActiveSection(current);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return activeSection;
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
  const activeSection = useActiveHomeSection();
  const contactLinks = [
    { href: 'mailto:vladmaftei@gmail.com', label: 'Email', value: 'vladmaftei@gmail.com' },
    { href: 'https://vladmaftei.artstation.com/', label: 'ArtStation', value: 'vladmaftei.artstation.com' },
    { href: 'https://www.linkedin.com/in/vladmaftei/', label: 'LinkedIn', value: 'linkedin.com/in/vladmaftei' },
    { href: 'https://www.instagram.com/_vladski_/', label: 'Instagram', value: '@_vladski_' },
    { href: 'https://x.com/Badgerz', label: 'X', value: '@Badgerz' }
  ];

  return (
    <>
      <SiteNav activeSection={activeSection} />

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
            <a className="enter-link" href={homeSectionHref('work')}>&gt; VIEW WORK_</a>
            <a className="secondary-link" href={homeSectionHref('process')}>PROCESS</a>
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

      {articles.length > 0 ? (
        <section id="articles" className="articles-section" aria-labelledby="articles-title">
          <SectionHeader eyebrow="ARTICLES / CASE STUDIES" titleId="articles-title" title="Field Notes">
            <p>
              {featuredArticle ? <>Current featured note: <a href={featuredArticle.href}>{featuredArticle.title}</a>.</> : null}
            </p>
          </SectionHeader>
          <ArticleIndex articles={articles} />
        </section>
      ) : null}

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
  const route = useLocationRoute();
  useHomeSectionScroll(route);
  const article = route.type === 'article' ? getArticle(route.slug) : undefined;
  const page = route.type === 'page' ? getPage(route.slug) : undefined;
  const project = route.type === 'project' ? getProject(route.slug) : undefined;
  const projectIndex = project ? projects.findIndex((candidate) => candidate.slug === project.slug) : -1;
  const previousProject = projectIndex >= 0 ? projects[(projectIndex - 1 + projects.length) % projects.length] : undefined;
  const nextProject = projectIndex >= 0 ? projects[(projectIndex + 1) % projects.length] : undefined;
  const defaultImage = 'assets/projects/fugi-visualizer/reference-tongue-in.png';
  const metadata: RouteMetadata = project
    ? {
      title: `${project.title} — Vlad Maftei`,
      description: project.description ?? `${project.title}, a portfolio project by Vlad Maftei.`,
      image: project.cover,
      canonicalPath: projectHref(project.slug ?? (route.type === 'project' ? route.slug : '')),
      type: 'article'
    }
    : article
      ? {
        title: `${article.title} — Vlad Maftei`,
        description: article.excerpt ?? `${article.title}, a field note by Vlad Maftei.`,
        image: article.cover ?? defaultImage,
        canonicalPath: articleHref(article.slug),
        type: 'article'
      }
      : page
        ? {
          title: `${page.title} — Vlad Maftei`,
          description: page.excerpt ?? `${page.title} — Vlad Maftei.`,
          image: page.cover ?? defaultImage,
          canonicalPath: pageHref(page.slug),
          type: 'website'
        }
        : {
          title: 'Vlad Maftei — VFX / 3D / AI',
          description: 'Vlad Maftei portfolio: cinematic visual work across VFX, 3D, procedural systems, product imagery, character experiments, and AI-assisted workflows.',
          image: defaultImage,
          canonicalPath: homeHref,
          type: 'website'
        };
  useRouteMetadata(metadata);

  return (
    <main className="site-shell">
      <div className="crt-overlay" aria-hidden="true" />
      {route.type === 'article' && article ? <ContentPage document={article} /> : null}
      {route.type === 'page' && page ? <ContentPage document={page} /> : null}
      {route.type === 'project' && project ? <ProjectDetailPage project={project} previousProject={previousProject} nextProject={nextProject} /> : null}
      {route.type === 'home' ? <HomePage /> : null}
      {((route.type === 'article' && !article) || (route.type === 'page' && !page) || (route.type === 'project' && !project)) ? <NotFoundPage /> : null}
    </main>
  );
}

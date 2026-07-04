import projectOverrides from '../../content/project-overrides.json';
import manualProjects from '../../content/manual-projects.json';
import importedProjects from './artstation-projects.json';

export type PortfolioProject = {
  slug?: string;
  title: string;
  year?: string;
  role?: string;
  tools?: string[];
  tags?: string[];
  description?: string;
  cover: string;
  gallery?: string[];
  videos?: Array<{
    title?: string;
    url: string;
    platform?: string;
    poster?: string;
  }>;
  sourceUrl?: string;
  featured?: boolean;
};

type ProjectOverride = Partial<PortfolioProject>;
type ProjectOverrideMap = Record<string, ProjectOverride>;

const fallbackProjects: PortfolioProject[] = [
  {
    slug: 'cat-walkman',
    title: 'Cat Walkman',
    year: '2023',
    role: 'VFX / 3D / AI',
    tools: ['Cinema 4D', 'Houdini'],
    tags: ['Featured', 'Character', 'Cyberpunk'],
    description: 'Featured portfolio piece. Replace with imported ArtStation copy and images.',
    cover: 'assets/placeholder-project.svg',
    gallery: ['assets/placeholder-project.svg'],
    sourceUrl: 'https://www.artstation.com/vladmaftei',
    featured: true
  },
  {
    slug: 'daft-punk-cover-art',
    title: 'Daft Punk cover art',
    year: '2023',
    role: '3D / LOOKDEV',
    tools: ['3D', 'Lighting', 'Post'],
    tags: ['Cover Art', 'Music', 'Hard Surface'],
    description: 'Placeholder entry until ArtStation import runs.',
    cover: 'assets/placeholder-project.svg',
    gallery: ['assets/placeholder-project.svg'],
    sourceUrl: 'https://www.artstation.com/vladmaftei'
  },
  {
    slug: 'philips-sensotouch',
    title: 'Philips Sensotouch',
    year: '2022',
    role: 'PRODUCT VISUALIZATION',
    tools: ['Modeling', 'Lighting', 'Render'],
    tags: ['Product', 'Commercial', 'CGI'],
    description: 'Placeholder entry until ArtStation import runs.',
    cover: 'assets/placeholder-project.svg',
    gallery: ['assets/placeholder-project.svg'],
    sourceUrl: 'https://www.artstation.com/vladmaftei'
  }
];

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

const overrides = projectOverrides as ProjectOverrideMap;

function normalizeProject(project: PortfolioProject): PortfolioProject {
  const slug = project.slug ?? slugify(project.title);
  const override = overrides[slug] ?? overrides[project.title.toLowerCase()] ?? {};
  const merged = { ...project, ...override, slug };

  return {
    ...merged,
    tags: override.tags ?? project.tags ?? [],
    tools: override.tools ?? project.tools ?? [],
    gallery: override.gallery ?? project.gallery ?? [],
    videos: override.videos ?? project.videos ?? []
  };
}

const normalizedImportedProjects = (importedProjects as PortfolioProject[]).map(normalizeProject);
const normalizedManualProjects = (manualProjects as PortfolioProject[]).map(normalizeProject);

export const projects: PortfolioProject[] = normalizedImportedProjects.length > 0
  ? normalizedImportedProjects
  : normalizedManualProjects.length > 0
    ? normalizedManualProjects
    : fallbackProjects.map(normalizeProject);

export function getProject(slug: string): PortfolioProject | undefined {
  return projects.find((project) => (project.slug ?? slugify(project.title)) === slug);
}

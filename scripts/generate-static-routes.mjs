import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asString, readMarkdownDocuments, slugify } from './lib/content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const siteUrl = (process.env.SITE_URL || 'https://vladmaftei.com').replace(/\/$/, '');
const defaultImage = 'assets/projects/fugi-visualizer/reference-tongue-in.png';
const baseHtml = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const importedProjects = JSON.parse(await fs.readFile(path.join(root, 'src/data/artstation-projects.json'), 'utf8'));
const manualProjects = JSON.parse(await fs.readFile(path.join(root, 'content/manual-projects.json'), 'utf8'));
const projects = importedProjects.length > 0 ? importedProjects : manualProjects;
const articles = await readMarkdownDocuments(root, 'content/articles', 'article');
const pages = await readMarkdownDocuments(root, 'content/pages', 'page');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteAsset(asset = defaultImage) {
  if (/^https?:\/\//i.test(asset)) return asset;
  return `${siteUrl}/${String(asset).replace(/^\//, '')}`;
}

function routeMeta({ title, description, route, image = defaultImage, type = 'website' }) {
  const canonical = `${siteUrl}/${route ? `${route.replace(/^\/+|\/+$/g, '')}/` : ''}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(absoluteAsset(image));
  const safeCanonical = escapeHtml(canonical);

  return `<!-- route-meta:start -->
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${safeCanonical}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${safeCanonical}" />
    <meta property="og:image" content="${safeImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />
    <title>${safeTitle}</title>
    <!-- route-meta:end -->`;
}

function renderRoute(metadata) {
  return baseHtml.replace(/<!-- route-meta:start -->[\s\S]*?<!-- route-meta:end -->/, routeMeta(metadata));
}

async function writeRoute(metadata) {
  const routeDirectory = path.join(dist, metadata.route);
  await fs.mkdir(routeDirectory, { recursive: true });
  await fs.writeFile(path.join(routeDirectory, 'index.html'), renderRoute(metadata));
}

const rootMetadata = {
  title: 'Vlad Maftei — VFX / 3D / AI',
  description: 'Vlad Maftei portfolio: cinematic visual work across VFX, 3D, procedural systems, product imagery, character experiments, and AI-assisted workflows.',
  route: '',
  image: defaultImage,
  type: 'website'
};

await fs.writeFile(path.join(dist, 'index.html'), renderRoute(rootMetadata));
await fs.writeFile(path.join(dist, '404.html'), renderRoute(rootMetadata));

const routeEntries = projects.map((project) => ({
  title: `${project.title} — Vlad Maftei`,
  description: project.description || `${project.title}, a portfolio project by Vlad Maftei.`,
  route: `projects/${project.slug || slugify(project.title)}`,
  image: project.cover || defaultImage,
  type: 'article'
}));

for (const document of [...articles, ...pages]) {
  if (asString(document.attributes.status) === 'draft') continue;
  const title = asString(document.attributes.title) || document.slug.replace(/-/g, ' ');
  routeEntries.push({
    title: `${title} — Vlad Maftei`,
    description: asString(document.attributes.excerpt) || `${title} — Vlad Maftei.`,
    route: `${document.kind === 'article' ? 'articles' : 'pages'}/${document.slug}`,
    image: asString(document.attributes.cover) || defaultImage,
    type: document.kind === 'article' ? 'article' : 'website'
  });
}

for (const route of routeEntries) await writeRoute(route);

const sitemapRoutes = ['', ...routeEntries.map((entry) => `${entry.route}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapRoutes.map((route) => `  <url><loc>${siteUrl}/${route}</loc></url>`).join('\n')}
</urlset>
`;

await fs.writeFile(path.join(dist, 'sitemap.xml'), sitemap);
console.log(`Generated ${routeEntries.length + 1} static route entr${routeEntries.length === 0 ? 'y' : 'ies'} and sitemap.xml.`);

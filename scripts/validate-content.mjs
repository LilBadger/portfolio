import fs from 'node:fs';
import path from 'node:path';
import { asArray, asString, readMarkdownDocuments } from './lib/content.mjs';

const root = process.cwd();
const dataPath = path.join(root, 'src/data/artstation-projects.json');
const manualProjectsPath = path.join(root, 'content/manual-projects.json');
const overridesPath = path.join(root, 'content/project-overrides.json');
const placeholderPath = path.join(root, 'public/assets/placeholder-project.svg');

let failures = 0;
let importedProjectCount = 0;
let manualProjectCount = 0;
let articleCount = 0;
let pageCount = 0;

function fail(message) {
  console.error(`CONTENT VALIDATION FAILED: ${message}`);
  failures += 1;
}

function isExternalAsset(asset) {
  return /^https?:\/\//i.test(String(asset));
}

function validateLocalAsset(asset, context) {
  if (!asset || isExternalAsset(asset)) return;
  const assetPath = path.join(root, 'public', String(asset).replace(/^\//, ''));
  if (!fs.existsSync(assetPath)) fail(`Missing local asset for ${context}: ${asset}`);
}

function validateMarkdownImageAssets(body, context) {
  const withoutCodeFences = String(body).replace(/```[\s\S]*?```/g, '');
  const imagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]+["'])?\)/g;
  let match;
  while ((match = imagePattern.exec(withoutCodeFences)) !== null) {
    const source = match[1];
    if (source.startsWith('#') || source.startsWith('data:')) continue;
    validateLocalAsset(source, `${context} body image`);
  }
}

function validateProject(project, index, sourceLabel) {
  if (!project || typeof project !== 'object') {
    fail(`${sourceLabel} project ${index} must be an object`);
    return;
  }

  if (!project.title) fail(`${sourceLabel} project ${index} missing title`);
  if (!project.cover) fail(`${sourceLabel} project ${project.title ?? index} missing cover`);

  validateLocalAsset(project.cover, `${sourceLabel} project ${project.title ?? index}`);
  for (const asset of project.gallery ?? []) {
    validateLocalAsset(asset, `${sourceLabel} project ${project.title ?? index}`);
  }
}

function validateProjectData() {
  if (!fs.existsSync(dataPath)) {
    fail(`Missing ${path.relative(root, dataPath)}`);
    return;
  }

  try {
    const projects = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    if (!Array.isArray(projects)) {
      fail('src/data/artstation-projects.json must be an array');
      return;
    }

    importedProjectCount = projects.length;
    projects.forEach((project, index) => validateProject(project, index, 'ArtStation'));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function validateManualProjectData() {
  if (!fs.existsSync(manualProjectsPath)) return;

  try {
    const projects = JSON.parse(fs.readFileSync(manualProjectsPath, 'utf8'));
    if (!Array.isArray(projects)) {
      fail('content/manual-projects.json must be an array');
      return;
    }

    manualProjectCount = projects.length;
    projects.forEach((project, index) => validateProject(project, index, 'Manual'));
  } catch (error) {
    fail(`Invalid content/manual-projects.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateProjectOverrides() {
  if (!fs.existsSync(overridesPath)) return;

  try {
    const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      fail('content/project-overrides.json must be an object keyed by project slug');
      return;
    }

    for (const [slug, override] of Object.entries(overrides)) {
      if (!/^[a-z0-9-]+$/.test(slug)) fail(`Project override key should be a slug: ${slug}`);
      if (!override || typeof override !== 'object' || Array.isArray(override)) {
        fail(`Project override for ${slug} must be an object`);
        continue;
      }
      validateLocalAsset(override.cover, `project override ${slug}`);
      for (const asset of override.gallery ?? []) validateLocalAsset(asset, `project override ${slug}`);
    }
  } catch (error) {
    fail(`Invalid content/project-overrides.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateStatus(status, context) {
  if (!['draft', 'published', ''].includes(status)) {
    fail(`${context} has invalid status '${status}'. Use draft or published.`);
  }
}

function validateDuplicateSlugs(documents, kind) {
  const seen = new Set();
  for (const document of documents) {
    if (seen.has(document.slug)) fail(`Duplicate ${kind} slug: ${document.slug}`);
    seen.add(document.slug);
  }
}

async function validateMarkdownContent() {
  const articles = await readMarkdownDocuments(root, 'content/articles', 'article');
  const pages = await readMarkdownDocuments(root, 'content/pages', 'page');
  articleCount = articles.length;
  pageCount = pages.length;

  validateDuplicateSlugs(articles, 'article');
  validateDuplicateSlugs(pages, 'page');

  for (const article of articles) {
    const context = `article ${article.relativeFile}`;
    const title = asString(article.attributes.title);
    const status = asString(article.attributes.status) || 'published';
    const date = asString(article.attributes.date);
    const cover = asString(article.attributes.cover);
    const tags = asArray(article.attributes.tags);

    if (!title) fail(`${context} missing title`);
    if (!date) fail(`${context} missing date`);
    validateStatus(status, context);
    validateLocalAsset(cover, context);
    if (!article.body) fail(`${context} has no body content`);
    validateMarkdownImageAssets(article.body, context);
    if (tags.length > 8) fail(`${context} has too many tags; keep metadata tight`);
  }

  for (const page of pages) {
    const context = `page ${page.relativeFile}`;
    const title = asString(page.attributes.title);
    const status = asString(page.attributes.status) || 'published';
    const cover = asString(page.attributes.cover);

    if (!title) fail(`${context} missing title`);
    validateStatus(status, context);
    validateLocalAsset(cover, context);
    if (!page.body) fail(`${context} has no body content`);
    validateMarkdownImageAssets(page.body, context);
  }
}

validateProjectData();
validateManualProjectData();
validateProjectOverrides();
await validateMarkdownContent();

if (!fs.existsSync(placeholderPath)) {
  fail('Missing public/assets/placeholder-project.svg');
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`Content validation ok: ${importedProjectCount} imported project(s), ${manualProjectCount} manual project(s), ${articleCount} article(s), ${pageCount} page(s).`);
}

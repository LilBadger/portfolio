#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const defaultUser = process.env.ARTSTATION_USERNAME || 'vladmaftei';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const username = String(args.user || args.username || defaultUser).replace(/^https?:\/\/(www\.)?artstation\.com\//, '').replace(/\/$/, '');
const maxPages = Number(args.pages || process.env.ARTSTATION_PAGES || 2);
const maxAssetsPerProject = Number(args['max-assets-per-project'] || process.env.ARTSTATION_MAX_ASSETS_PER_PROJECT || 4);
const delayMs = Number(args.delay || process.env.ARTSTATION_DELAY_MS || 350);

const rawDir = path.join(root, 'content/artstation-raw');
const outputDataPath = path.join(root, 'src/data/artstation-projects.json');
const outputAssetRoot = path.join(root, 'public/assets/artstation');

const preferredOrderPath = path.join(root, 'content/project-order.json');
let preferredOrder = [];
let featuredTitleContains = 'cat walkman';
try {
  const order = JSON.parse(await fs.readFile(preferredOrderPath, 'utf8'));
  preferredOrder = order.preferredOrder ?? [];
  featuredTitleContains = order.featuredTitleContains ?? featuredTitleContains;
} catch {
  // optional
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'project';
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      origin: 'https://www.artstation.com',
      'user-agent': 'VladMafteiPortfolioImporter/1.0 (+local personal portfolio build)'
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} while fetching ${url}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const preview = (await response.text()).slice(0, 180).replace(/\s+/g, ' ');
    throw new Error(`Expected JSON but received ${contentType || 'unknown content type'} from ${url}: ${preview}`);
  }
  return response.json();
}

async function downloadFile(url, targetPath) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'VladMafteiPortfolioImporter/1.0 (+local personal portfolio build)'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} while downloading ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);
}

function firstDefined(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function getCardImage(card) {
  return firstDefined(
    card?.cover?.large_image_url,
    card?.cover?.medium_image_url,
    card?.cover?.small_image_url,
    card?.large_image_url,
    card?.medium_image_url,
    card?.small_image_url,
    card?.smaller_square_cover_url,
    card?.cover_url
  );
}

function getAssetImage(asset) {
  return firstDefined(
    asset?.image_url,
    asset?.large_image_url,
    asset?.medium_image_url,
    asset?.small_image_url,
    asset?.display_url,
    asset?.url
  );
}

function getHashId(card) {
  if (card?.hash_id) return card.hash_id;
  if (card?.permalink) {
    const match = String(card.permalink).match(/\/(?:artwork|projects)\/([^/?#]+)/);
    if (match) return match[1];
  }
  if (card?.short_url) {
    const match = String(card.short_url).match(/\/p\/([^/?#]+)/);
    if (match) return match[1];
  }
  return null;
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname).toLowerCase();
    if (extension && extension.length <= 6) return extension;
  } catch {
    // ignore
  }
  return '.jpg';
}

function sortProjects(projects) {
  const order = preferredOrder.map((title) => title.toLowerCase());
  return [...projects].sort((a, b) => {
    const ai = order.findIndex((title) => a.title.toLowerCase().includes(title));
    const bi = order.findIndex((title) => b.title.toLowerCase().includes(title));
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.title.localeCompare(b.title);
  });
}

async function getProjectCards() {
  const cards = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `https://www.artstation.com/users/${encodeURIComponent(username)}/projects.json?album_id=all&page=${page}`;
    console.log(`Fetching ${url}`);
    const json = await fetchJson(url);
    await fs.mkdir(rawDir, { recursive: true });
    await fs.writeFile(path.join(rawDir, `projects-page-${page}.json`), JSON.stringify(json, null, 2));
    const pageCards = Array.isArray(json?.data) ? json.data : [];
    cards.push(...pageCards);
    if (pageCards.length === 0 || json?.current_page >= json?.last_page) break;
    await sleep(delayMs);
  }
  return cards;
}

async function normalizeProject(card, cardIndex) {
  const title = card?.title || `Untitled Project ${cardIndex + 1}`;
  const slug = slugify(title);
  const hashId = getHashId(card);
  const projectDir = path.join(outputAssetRoot, slug);
  const relativeDir = `assets/artstation/${slug}`;
  let detail = null;

  if (hashId) {
    const detailUrl = `https://www.artstation.com/projects/${encodeURIComponent(hashId)}.json`;
    try {
      console.log(`Fetching detail: ${title}`);
      detail = await fetchJson(detailUrl);
      await fs.mkdir(rawDir, { recursive: true });
      await fs.writeFile(path.join(rawDir, `${slug}.json`), JSON.stringify(detail, null, 2));
      await sleep(delayMs);
    } catch (error) {
      console.warn(`Detail fetch failed for ${title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const assetUrls = [];
  const detailAssets = Array.isArray(detail?.assets) ? detail.assets : [];
  for (const asset of detailAssets) {
    const assetUrl = getAssetImage(asset);
    if (assetUrl && !assetUrls.includes(assetUrl)) assetUrls.push(assetUrl);
  }

  const cardImage = getCardImage(card);
  if (cardImage && !assetUrls.includes(cardImage)) assetUrls.unshift(cardImage);

  const downloaded = [];
  for (const [assetIndex, imageUrl] of assetUrls.slice(0, maxAssetsPerProject).entries()) {
    const extension = extensionFromUrl(imageUrl);
    const filename = `${String(assetIndex + 1).padStart(2, '0')}-${slug}${extension}`;
    const target = path.join(projectDir, filename);
    try {
      await downloadFile(imageUrl, target);
      downloaded.push(`${relativeDir}/${filename}`);
      await sleep(delayMs);
    } catch (error) {
      console.warn(`Image download failed for ${title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const year = firstDefined(
    detail?.published_at,
    detail?.created_at,
    card?.published_at,
    card?.created_at
  )?.slice(0, 4);

  const tags = [
    ...(Array.isArray(detail?.tags) ? detail.tags : []),
    ...(Array.isArray(card?.tags) ? card.tags : [])
  ]
    .map((tag) => typeof tag === 'string' ? tag : tag?.name)
    .filter(Boolean)
    .slice(0, 8);

  const sourceUrl = firstDefined(detail?.permalink, card?.permalink, `https://www.artstation.com/${username}`);
  const description = String(detail?.description || card?.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    slug,
    title,
    year,
    role: 'VFX / 3D / AI / COMPOSITING',
    tools: [],
    tags,
    description: description || 'Imported from Vlad Maftei ArtStation portfolio.',
    cover: downloaded[0] || 'assets/placeholder-project.svg',
    gallery: downloaded,
    sourceUrl,
    featured: title.toLowerCase().includes(featuredTitleContains)
  };
}

async function main() {
  console.log(`Importing ArtStation projects for ${username}`);
  await fs.mkdir(outputAssetRoot, { recursive: true });
  const cards = await getProjectCards();
  if (cards.length === 0) {
    throw new Error('No ArtStation projects found. Endpoint may have changed or profile is unavailable.');
  }

  const projects = [];
  for (const [index, card] of cards.entries()) {
    projects.push(await normalizeProject(card, index));
  }

  const sorted = sortProjects(projects);
  if (!sorted.some((project) => project.featured) && sorted[0]) sorted[0].featured = true;

  await fs.writeFile(outputDataPath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Wrote ${sorted.length} project(s) to ${path.relative(root, outputDataPath)}`);
  console.log('Run: npm run validate:content && npm run dev');
}

main().catch(async (error) => {
  console.error(`ArtStation import failed: ${error instanceof Error ? error.message : String(error)}`);
  await fs.mkdir(rawDir, { recursive: true });
  await fs.writeFile(path.join(rawDir, 'IMPORT_FAILED.txt'), `${new Date().toISOString()}\n${error?.stack ?? error}\n`);
  process.exit(1);
});

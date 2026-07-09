import { articleHref, pageHref } from '../utils/routes';

type FrontmatterValue = string | number | boolean | string[];

type ContentKind = 'article' | 'page';
export type ContentStatus = 'draft' | 'published';

export type ContentDocument = {
  kind: ContentKind;
  slug: string;
  title: string;
  status: ContentStatus;
  body: string;
  href: string;
  date?: string;
  updated?: string;
  excerpt?: string;
  tags: string[];
  cover?: string;
  heroTitle?: string;
  featured: boolean;
  order: number;
};

const articleFiles = import.meta.glob('../../content/articles/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const pageFiles = import.meta.glob('../../content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

function slugFromPath(filePath: string): string {
  const match = filePath.match(/\/([^/]+)\.md(?:\?raw)?$/);
  return match?.[1] ?? filePath;
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function parseArray(value: string): string[] {
  const trimmed = value.trim();
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed;

  return inner
    .split(',')
    .map((part) => stripQuotes(part.trim()))
    .filter(Boolean);
}

function parseValue(rawValue: string): FrontmatterValue {
  const value = rawValue.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('[') && value.endsWith(']')) return parseArray(value);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return stripQuotes(value);
}

function parseFrontmatter(raw: string): { attributes: Record<string, FrontmatterValue>; body: string } {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!match) return { attributes: {}, body: raw.trim() };

  const attributes: Record<string, FrontmatterValue> = {};
  for (const originalLine of match[1].split(/\r?\n/)) {
    const line = originalLine.trim();
    if (!line || line.startsWith('#')) continue;
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;
    attributes[keyValue[1]] = parseValue(keyValue[2]);
  }

  return { attributes, body: raw.slice(match[0].length).trim() };
}

function stringValue(value: FrontmatterValue | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function booleanValue(value: FrontmatterValue | undefined): boolean {
  return value === true || String(value).toLowerCase() === 'true';
}

function numberValue(value: FrontmatterValue | undefined, fallback = 999): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArray(value: FrontmatterValue | undefined): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return parseArray(value);
  return [];
}

function statusValue(value: FrontmatterValue | undefined): ContentStatus {
  return stringValue(value) === 'draft' ? 'draft' : 'published';
}

function parseDocument(kind: ContentKind, filePath: string, raw: string): ContentDocument {
  const slug = slugFromPath(filePath);
  const { attributes, body } = parseFrontmatter(raw);
  const title = stringValue(attributes.title) ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    kind,
    slug,
    title,
    status: statusValue(attributes.status),
    body,
    href: kind === 'article' ? articleHref(slug) : pageHref(slug),
    date: stringValue(attributes.date),
    updated: stringValue(attributes.updated),
    excerpt: stringValue(attributes.excerpt),
    tags: stringArray(attributes.tags),
    cover: stringValue(attributes.cover),
    heroTitle: stringValue(attributes.heroTitle),
    featured: booleanValue(attributes.featured),
    order: numberValue(attributes.order)
  };
}

function byDateDescending(a: ContentDocument, b: ContentDocument): number {
  return String(b.date ?? '').localeCompare(String(a.date ?? ''));
}

function byOrderThenTitle(a: ContentDocument, b: ContentDocument): number {
  return a.order - b.order || a.title.localeCompare(b.title);
}

export const allArticles: ContentDocument[] = Object.entries(articleFiles)
  .map(([filePath, raw]) => parseDocument('article', filePath, raw));

export const allPages: ContentDocument[] = Object.entries(pageFiles)
  .map(([filePath, raw]) => parseDocument('page', filePath, raw));

export const articles: ContentDocument[] = allArticles
  .filter((document) => document.status === 'published')
  .sort(byDateDescending);

export const pages: ContentDocument[] = allPages
  .filter((document) => document.status === 'published')
  .sort(byOrderThenTitle);

export const featuredArticle: ContentDocument | undefined =
  articles.find((article) => article.featured) ?? articles[0];

export function getArticle(slug: string): ContentDocument | undefined {
  return articles.find((article) => article.slug === slug);
}

export function getPage(slug: string): ContentDocument | undefined {
  return pages.find((page) => page.slug === slug);
}

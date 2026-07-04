import fs from 'node:fs/promises';
import path from 'node:path';

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'untitled';
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function parseArray(value) {
  const trimmed = value.trim();
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed;

  return inner
    .split(',')
    .map((part) => stripQuotes(part.trim()))
    .filter(Boolean);
}

function parseValue(rawValue) {
  const value = rawValue.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('[') && value.endsWith(']')) return parseArray(value);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return stripQuotes(value);
}

export function parseMarkdownDocument(raw, fallbackSlug, kind) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  const attributes = {};
  let body = raw.trim();

  if (match) {
    for (const originalLine of match[1].split(/\r?\n/)) {
      const line = originalLine.trim();
      if (!line || line.startsWith('#')) continue;
      const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!keyValue) continue;
      attributes[keyValue[1]] = parseValue(keyValue[2]);
    }
    body = raw.slice(match[0].length).trim();
  }

  return {
    kind,
    slug: fallbackSlug,
    attributes,
    body
  };
}

export async function readMarkdownDocuments(root, folder, kind) {
  const directory = path.join(root, folder);
  const files = await fs.readdir(directory).catch(() => []);
  const docs = [];

  for (const filename of files.filter((file) => file.endsWith('.md')).sort()) {
    const fullPath = path.join(directory, filename);
    const raw = await fs.readFile(fullPath, 'utf8');
    const slug = filename.replace(/\.md$/, '');
    docs.push({
      file: fullPath,
      relativeFile: path.relative(root, fullPath),
      ...parseMarkdownDocument(raw, slug, kind)
    });
  }

  return docs;
}

export function asString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

export function asArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return parseArray(value);
  return [];
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { slugify } from './lib/content.mjs';

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      args._.push(item);
      continue;
    }
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
const title = String(args.title || args._.join(' ')).trim();

if (!title) {
  console.error('Usage: npm run new:page -- "Page Title" [--published] [--order 30]');
  process.exit(1);
}

const slug = slugify(String(args.slug || title));
const target = path.join(process.cwd(), 'content/pages', `${slug}.md`);

try {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.access(target);
  console.error(`Refusing to overwrite existing page: ${path.relative(process.cwd(), target)}`);
  process.exit(1);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const status = args.published ? 'published' : 'draft';
const order = Number.isFinite(Number(args.order)) ? Number(args.order) : 999;
const template = `---
title: ${title}
status: ${status}
excerpt: Replace this with a compact page description.
order: ${order}
---
## ${title}

Write the page content here.
`;

await fs.writeFile(target, template);
console.log(`Created ${path.relative(process.cwd(), target)}`);
console.log(`Route: #/pages/${slug}`);
console.log('Draft pages are hidden. Change status to published when ready.');

#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { slugify, todayIsoDate } from './lib/content.mjs';

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
  console.error('Usage: npm run new:article -- "Article Title" [--published] [--featured]');
  process.exit(1);
}

const slug = slugify(String(args.slug || title));
const target = path.join(process.cwd(), 'content/articles', `${slug}.md`);

try {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.access(target);
  console.error(`Refusing to overwrite existing article: ${path.relative(process.cwd(), target)}`);
  process.exit(1);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const status = args.published ? 'published' : 'draft';
const featured = args.featured ? 'true' : 'false';
const heroTitle = title.toUpperCase().replace(/\s+/g, ' ');
const template = `---
title: ${title}
date: ${todayIsoDate()}
status: ${status}
excerpt: Replace this with a sharp one- or two-sentence teaser.
tags: [process, vfx]
featured: ${featured}
cover: assets/placeholder-project.svg
heroTitle: ${heroTitle}
---
## Intent

Write the reason this piece exists and what the viewer should understand first.

## Breakdown

- Reference and mood
- Asset build
- Animation, simulation, or layout
- Render, comp, and grade
- Final result

## Notes

Add images with Markdown syntax, for example:

![Breakdown frame](assets/placeholder-project.svg)

Keep the writing compact. Let the images do the heavy lifting.
`;

await fs.writeFile(target, template);
console.log(`Created ${path.relative(process.cwd(), target)}`);
console.log(`Route: #/articles/${slug}`);
console.log('Draft articles are hidden. Change status to published when ready.');

# Phase 13 — future publishing system

Goal: make future publishing easy and safe.

Tasks:

- Read `docs/PUBLISHING_NEW_CONTENT.md`.
- Verify `npm run new:article -- "Title"` creates a draft Markdown article under `content/articles/`.
- Verify `npm run new:page -- "Title"` creates a draft Markdown page under `content/pages/`.
- Verify drafts are hidden until `status: published`.
- Verify article/page routes use hash URLs for GitHub Pages safety.
- Verify curated project copy lives in `content/project-overrides.json`, not in `src/data/artstation-projects.json`.

Checks:

```bash
npm run validate:content
npm run check
```

Art-direction check:

- New pages/articles must inherit the terminal/dossier/glitch style.
- Do not let article pages become generic blog cards or clean corporate pages.

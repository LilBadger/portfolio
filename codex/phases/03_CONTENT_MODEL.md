# Phase 03 — content model and information architecture

Goal: keep future publishing data-driven.

Tasks:

- Confirm project data is normalized through `src/data/projects.ts`.
- Confirm imported data stays in `src/data/artstation-projects.json`.
- Confirm curated project copy and featured flags are read from `content/project-overrides.json`.
- Confirm published articles load from `content/articles/*.md`.
- Confirm published pages load from `content/pages/*.md`.
- Confirm no new normal content is hardcoded in `src/App.tsx`.

Checks:

```bash
npm run validate:content
npm run check
```

Publishing smoke check:

```bash
npm run new:article -- "Codex Smoke Test Article"
npm run new:page -- "Codex Smoke Test Page"
npm run validate:content
npm run check
rm content/articles/codex-smoke-test-article.md content/pages/codex-smoke-test-page.md
```

Art-direction check:

- Article/page UI must feel like terminal dossier screens.
- Project metadata should stay compact in the hero and richer below the fold.

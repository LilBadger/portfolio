# Pack validation

Validated before packaging v3:

```bash
npm ci --ignore-scripts
npm run validate:content
npm run check
npm run new:article -- "Codex Smoke Test Article"
npm run new:page -- "Codex Smoke Test Page"
npm run validate:content
rm content/articles/codex-smoke-test-article.md content/pages/codex-smoke-test-page.md
npm run validate:content
```

Result:

- TypeScript build passed.
- Vite production build passed.
- Content validation passed with zero imported ArtStation projects, using fallback placeholder data.
- Article scaffolding script created a draft Markdown article successfully.
- Page scaffolding script created a draft Markdown page successfully.
- Smoke-test content was removed before packaging.
- Markdown articles/pages are data-driven and do not require editing `src/App.tsx`.
- Curated project overrides are separated into `content/project-overrides.json` so ArtStation re-imports do not wipe final portfolio copy.

ArtStation assets were not bundled in this pack. Codex should run:

```bash
npm run import:artstation -- --user vladmaftei --pages 2 --max-assets-per-project 4
```

Then commit `public/assets/artstation/` and `src/data/artstation-projects.json`.

## Registry URL check

Before handing off, confirm the lockfile does not contain internal package registry URLs:

```bash
grep -R "applied-caas\|artifactory" package-lock.json package.json || true
```

Expected result: no matches.

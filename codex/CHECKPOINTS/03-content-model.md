# Phase 03 content model

Date: 2026-07-03

## What changed

- Confirmed article/page publishing remains Markdown-driven.
- Confirmed manual project fallback data validates alongside project overrides.
- Confirmed smoke-test content can be generated and removed without React edits.

## Commands run

```bash
npm run new:article -- "Codex Smoke Test Article"
npm run new:page -- "Codex Smoke Test Page"
npm run validate:content
Remove-Item -LiteralPath "content\\articles\\codex-smoke-test-article.md", "content\\pages\\codex-smoke-test-page.md"
npm run validate:content
npm run check
```

## Code check result

- Smoke-test article/page generation passed.
- `npm run validate:content` passed after generation and after cleanup.
- `npm run check` passed.

## Art-direction check result

- Project, article, and page routes continue to use the terminal/dossier visual system.
- Project records are now richer than placeholders, but the project artwork is still represented by placeholder imagery.

## Open issues

- Real artwork files are needed to judge project-card image composition and gallery behavior.

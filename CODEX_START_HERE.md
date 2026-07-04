# Codex start file — build Vlad Maftei portfolio

You are Codex working inside this repository. Build a polished portfolio website for Vlad Maftei, VFX / 3D / AI / compositing artist.

## Absolute inputs

- Main art-direction reference: `references/mockup/ARTISTWEBSITE.png`
- ArtStation source: `https://www.artstation.com/vladmaftei`
- Art direction docs: `docs/ART_DIRECTION.md`
- Build plan: `docs/CODEX_PHASE_PLAN.md`
- Publishing workflow: `docs/PUBLISHING_NEW_CONTENT.md`
- GitHub Pages notes: `docs/GITHUB_PAGES_TESTING.md`
- Known risks and guardrails: `docs/RISK_REGISTER.md`

## Non-negotiable output

A responsive, static, GitHub-Pages-ready portfolio site with:

- Full-screen cyberpunk/hacker hero.
- Big distressed/glitch title: `VLAD MAFTEI`.
- Role line: `VFX / 3D / AI / COMPOSITING`.
- Glitchy terminal/UI overlays, scanlines, binary noise, subtle async flicker.
- Featured project area, starting with `CAT WALKMAN` when assets are available.
- Project grid/detail sections using the user's public ArtStation artwork.
- Hash-routed article pages from `content/articles/*.md`.
- Hash-routed static pages from `content/pages/*.md`.
- Safe curated project overrides from `content/project-overrides.json`, never hand-edited inside the importer output.
- Mobile layout that feels intentionally designed, not just collapsed desktop.
- Accessibility: keyboard navigation, readable text, alt text, reduced-motion support.
- Performance: no giant unoptimized images in the initial viewport.

## Content system rules

Do not hardcode new articles or pages in `src/App.tsx`.

Use:

```bash
npm run new:article -- "Article Title"
npm run new:page -- "Page Title"
```

Then edit the generated Markdown under `content/articles/` or `content/pages/`.

Draft content is hidden. Published content appears automatically after:

```bash
npm run validate:content
npm run check
```

Curated project copy, roles, tags, featured flags, and final descriptions must live in:

```text
content/project-overrides.json
```

`src/data/artstation-projects.json` is importer output and may be overwritten.

## Process rules

Work phase by phase. After every phase, update `codex/STATE.txt` and create a short checkpoint note in `codex/CHECKPOINTS/` with:

1. What changed.
2. Commands run.
3. Code check result.
4. Art-direction check result.
5. Open issues.

Do not proceed to the next phase until the current phase passes its checks or the failure is documented with the fix plan.

## First commands

```bash
npm ci
npm run check
npm run import:artstation -- --user vladmaftei --pages 2 --max-assets-per-project 4
npm run validate:content
npm run dev
```

If ArtStation blocks or changes its public JSON format, keep the site functional with placeholder data and document the failure in `codex/CHECKPOINTS/artstation-import.md`. Do not attempt login, token theft, paywall bypassing, or scraping private/protected assets.

## Future publishing smoke check

Before considering the site maintainable, prove that content can be added without editing React layout files:

```bash
npm run new:article -- "Codex Smoke Test Article"
npm run new:page -- "Codex Smoke Test Page"
npm run validate:content
npm run check
```

Then delete the smoke-test Markdown files unless the user wants to keep them.

## Finish criteria

Before final handoff:

```bash
npm run validate:content
npm run check
npm run build
```

Also produce desktop and mobile screenshots, compare against `references/mockup/ARTISTWEBSITE.png`, and list any deliberate deviations.

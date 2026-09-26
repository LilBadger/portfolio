# Vlad Maftei portfolio Codex starter pack

This pack is a Codex-ready starting point for rebuilding the portfolio mockup into a real static website with a glitchy cyberpunk/hacker UI, original artwork from ArtStation, GitHub Pages testing, and a maintainable publishing system for future articles/pages.

## What is inside

- `CODEX_START_HERE.md` — paste/read this first in Codex.
- `docs/CODEX_PHASE_PLAN.md` — phased build plan with code checks and art-direction checks after every step.
- `docs/ART_DIRECTION.md` — visual target based on the supplied mockup.
- `docs/PUBLISHING_NEW_CONTENT.md` — exact workflow for adding articles, pages, and safe project overrides.
- `docs/RISK_REGISTER.md` — known technical/art-direction risks and checks.
- `references/mockup/ARTISTWEBSITE.png` — the mockup reference image.
- `scripts/import-artstation.mjs` — public ArtStation importer for Vlad's profile.
- `scripts/new-article.mjs` and `scripts/new-page.mjs` — content scaffolding scripts.
- `.github/workflows/pages.yml` — GitHub Pages test publishing workflow.
- A runnable Vite/React starter with glitch UI components, hash-routed articles/pages, and placeholder content.

## Start locally

```bash
npm ci
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Regenerate media (thumbnails, hover loops, hero reel)

```bash
npm run build:media            # only builds what is missing
npm run build:media -- --force # rebuild everything
```

Needs `ffmpeg` and ImageMagick 7 (`magick`) locally. Outputs go to `public/assets/generated/` and are committed, so CI does not need either tool. Every project gets `thumbs/<slug>-{640,1280}.{avif,webp}` and a silent `loops/<slug>.mp4`; edit the `reel` and `customLoops` lists in `scripts/build-media.mjs` to change shots. Each reel shot carries the project `slug` it shows; the script writes `reel/reel.json` with measured shot timings, which drives the hero's `$ now_playing:` line. Run it after adding a project.

## Collage reel (the hero)

`npm run build:collage` renders a beat-cut, text-free collage edit of the recent work (needs Python with Pillow + numpy and ffmpeg) to `public/assets/generated/reel/reel-collage-*`. It is the default hero reel (`?reel=classic` shows the plain reel); edit the `EDIT` list in `scripts/build-collage-reel.py` to change shots and treatments.

## Featured grid, archive, filters, breakdowns

Set these per project in `content/project-overrides.json`:

- `feature` puts a project in the featured grid; everything else goes to the archive list.
- `date` (YYYY-MM-DD) sorts both the grid and the archive newest first; tile shapes follow position (first tile is the large lead).
- `kind`: filter flags (`ai`, `3d`, `vfx`, `product`, `realtime`, `code`).
- `year`: shown in the grid and archive.
- `breakdown`: same-shot `before`/`after` pass pairs for the drag-to-wipe slider (homepage Process section and the project page).

## Pull public ArtStation projects

```bash
npm run import:artstation -- --user vladmaftei --pages 2 --max-assets-per-project 4
npm run validate:content
npm run dev
```

The importer uses public ArtStation project JSON endpoints and downloads only public image assets. It does not log in, bypass protections, or scrape private content.

If ArtStation blocks automation, add verified entries to `content/manual-projects.json`; the site uses that file when importer output is empty.

## Add a new article

```bash
npm run new:article -- "My New Breakdown"
```

Edit the generated Markdown file in `content/articles/`. Drafts are hidden. Change `status: draft` to `status: published` when ready.

## Add a new page

```bash
npm run new:page -- "Services"
```

Edit the generated Markdown file in `content/pages/`. Published pages automatically appear in the dossier links section.

## Keep project edits safe from re-imports

Do not hand-edit curated copy inside `src/data/artstation-projects.json`. Use:

```text
content/project-overrides.json
```

That keeps final copy, roles, tags, featured flags, and curated descriptions safe when ArtStation data is refreshed.

## Test build

```bash
npm run validate:content
npm run check
npm run build
```

## GitHub Pages testing

1. Create a GitHub repository for the test site.
2. Push this project to `main`.
3. In GitHub repo settings, set **Pages → Build and deployment → Source → GitHub Actions**.
4. For a project repo, the included workflow publishes at `https://USERNAME.github.io/REPO_NAME/`.
5. For a root user site repo named `USERNAME.github.io`, set the repo variable `VITE_BASE_PATH` to `/` or edit `vite.config.ts`.

## Important art rule

Use the uploaded mockup and the DeadSec-like hacker/glitch vibe as inspiration only. Do not copy Watch Dogs 2/DeadSec logos, icons, exact UI screens, or copyrighted assets. The final site must be Vlad Maftei branded and built around Vlad's own artwork.

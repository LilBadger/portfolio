# Codex phased build plan with checks

Follow the phases in order. Commit after each successful phase or write a checkpoint note explaining why not.

## Phase 00 — Ingest pack and create baseline

Tasks:

- Read `CODEX_START_HERE.md`, `docs/ART_DIRECTION.md`, and this file.
- Inspect `references/mockup/ARTISTWEBSITE.png`.
- Run initial install/build commands.
- Start the dev server and capture a desktop screenshot.

Code checks:

```bash
npm ci
npm run check
```

Art-direction checks:

- The baseline already shows the key composition: left identity block, ghost data field, right featured project, article/phone motifs.
- Overall feel is black, glitchy, monochrome with acid green/magenta accents.

Checkpoint:

- Create `codex/CHECKPOINTS/00-baseline.md`.
- Update `codex/STATE.txt`.

---

## Phase 01 — Repository and environment hardening

Tasks:

- Confirm Vite base-path behavior for GitHub Pages.
- Keep `.github/workflows/pages.yml` working for a project repo.
- Add/adjust `.env.example` if needed.
- Confirm Node version in workflow and local compatibility.
- Initialize Git only if the folder is not already a repository.

Code checks:

```bash
npm run check
npm run build
```

Art-direction checks:

- No visual regressions from config edits.
- Site still renders without ArtStation assets.

Checkpoint:

- `codex/CHECKPOINTS/01-repo-env.md`

---

## Phase 02 — ArtStation artwork ingestion

Tasks:

- Use `https://www.artstation.com/vladmaftei` as the source profile.
- Run the importer:

```bash
npm run import:artstation -- --user vladmaftei --pages 2 --max-assets-per-project 4
npm run validate:content
```

- Confirm downloaded files land under `public/assets/artstation/`.
- Confirm normalized metadata lands in `src/data/artstation-projects.json`.
- If the endpoint fails, document it and add manually verified entries to `content/manual-projects.json` using `docs/ARTSTATION_IMPORT.md`.

Code checks:

```bash
npm run validate:content
npm run check
```

Art-direction checks:

- `Cat Walkman` becomes the featured project if available.
- Images are not stretched, pixelated, or cropped in a way that kills the artwork.
- Grayscale/scanline treatment works, with hover/focus reveal.
- Metadata titles are uppercase in UI but preserve original title in data.

Checkpoint:

- `codex/CHECKPOINTS/02-artstation-import.md`

---

## Phase 03 — Content model and information architecture

Tasks:

- Keep the project schema data-driven: slug, title, year, role, tools, tags, description, cover, gallery, sourceUrl, featured flag.
- Preserve the existing article/page content layer instead of hardcoding new content in `src/App.tsx`.
- Confirm article Markdown loads from `content/articles/*.md` and routes through `#/articles/<slug>`.
- Confirm page Markdown loads from `content/pages/*.md` and routes through `#/pages/<slug>`.
- Confirm curated project edits live in `content/project-overrides.json` and survive ArtStation re-imports.
- Add robust fallbacks for missing images, years, dates, and excerpts.

Code checks:

```bash
npm run validate:content
npm run check
```

Publishing checks:

```bash
npm run new:article -- "Codex Smoke Test Article"
npm run new:page -- "Codex Smoke Test Page"
npm run validate:content
npm run check
rm content/articles/codex-smoke-test-article.md content/pages/codex-smoke-test-page.md
```

Art-direction checks:

- UI labels feel like dossier/terminal metadata, not a standard portfolio template.
- Project data density is compact in hero and richer lower on page.
- Article/page routes inherit the same corrupted broadcast language as the home page.

Checkpoint:

- `codex/CHECKPOINTS/03-content-model.md`

---

## Phase 04 — Layout system and responsive grid

Tasks:

- Rebuild the hero as a precise cinematic grid.
- Implement responsive breakpoints for desktop, tablet, and mobile.
- Ensure safe spacing on ultrawide screens and laptops.
- Add project grid/detail section below the hero.
- Make the CTA scroll to the work section.

Code checks:

```bash
npm run check
npm run build
```

Manual viewport checks:

- 1920×1080
- 1672×941, matching the mockup aspect
- 1440×900
- 1024×768
- 390×844

Art-direction checks:

- At desktop, the page still resembles the mockup composition.
- On mobile, it becomes a strong intentional stacked terminal interface.
- The hero is not centered like a generic landing page.

Checkpoint:

- `codex/CHECKPOINTS/04-layout-responsive.md`

---

## Phase 05 — Glitch animation engine

Tasks:

- Improve text glitch bursts with pseudo elements, clipping, and random timing.
- Add scanline/noise overlays at page and image levels.
- Add binary/dither motion for the center ghost field.
- Add subtle pointer parallax only where it helps.
- Respect `prefers-reduced-motion` by disabling intense animation.

Code checks:

```bash
npm run check
npm run build
```

Performance checks:

- No animation should cause obvious jank on a normal laptop.
- Avoid heavy canvas loops unless measured.
- Avoid animation of expensive layout properties where transform/opacity works.

Art-direction checks:

- The vibe is corrupted broadcast/hacker UI.
- Motion is irregular and sharp, not smooth corporate motion.
- Text remains readable.

Checkpoint:

- `codex/CHECKPOINTS/05-animation.md`

---

## Phase 06 — Hero polish

Tasks:

- Polish top-left system status module.
- Improve distressed title texture.
- Improve `_ARTIST` label, role divider, CTA cursor.
- Improve featured project module with real image.
- Improve article panel: `BUILDING A CYBERPUNK BUCHAREST WITH AI_`.
- Improve phone preview or replace it with a convincing responsive mock component.

Code checks:

```bash
npm run check
npm run build
```

Art-direction checks:

- Compare directly to `references/mockup/ARTISTWEBSITE.png`.
- Giant title must dominate.
- Right-side modules should feel like floating surveillance panels.
- Green/magenta accents must stay sparse.

Checkpoint:

- `codex/CHECKPOINTS/06-hero-polish.md`

---

## Phase 07 — Work section and project detail UX

Tasks:

- Build project cards from imported data.
- Add filter/tags only if they fit the visual style.
- Add project detail overlay/page/expanded cards with galleries.
- Include links back to ArtStation project pages.
- Add keyboard-friendly open/close behavior if using overlays.

Code checks:

```bash
npm run validate:content
npm run check
npm run build
```

Art-direction checks:

- Cards look like corrupted dossiers, not clean Behance cards.
- Artwork remains the hero of each card.
- Hover/focus states feel glitchy but usable.

Checkpoint:

- `codex/CHECKPOINTS/07-work-detail.md`

---

## Phase 08 — About, article, and contact sections

Tasks:

- Add a concise about section for Vlad as VFX / 3D / AI / compositing artist.
- Add article teaser section around cyberpunk Bucharest / AI workflow if content is available.
- Add contact CTA with email/social links only after user-provided links are known.
- Do not invent client claims or awards.

Code checks:

```bash
npm run check
npm run build
```

Art-direction checks:

- These sections should extend the terminal dossier language.
- Avoid long walls of text.
- Keep the rhythm: black, broken imagery, metadata, neon micro accents.

Checkpoint:

- `codex/CHECKPOINTS/08-about-contact.md`

---

## Phase 09 — Accessibility and reduced-motion pass

Tasks:

- Add meaningful alt text for all project images.
- Check keyboard order and focus rings.
- Confirm sufficient contrast for normal text.
- Confirm `prefers-reduced-motion` disables glitch-heavy animation.
- Ensure no critical information is only conveyed through animation.

Code checks:

```bash
npm run check
npm run build
```

Manual checks:

- Tab through the whole page.
- Test with reduced motion enabled.
- Test at 200% browser zoom.

Art-direction checks:

- Accessibility fixes do not turn the site into a generic clean theme.
- Focus states can be neon/terminal styled.

Checkpoint:

- `codex/CHECKPOINTS/09-accessibility.md`

---

## Phase 10 — Performance and asset optimization

Tasks:

- Convert heavy images to web-friendly sizes/formats where appropriate.
- Use responsive image sizes or lazy loading below the fold.
- Keep first viewport lightweight.
- Do not load every full-resolution ArtStation image immediately.

Code checks:

```bash
npm run validate:content
npm run check
npm run build
```

Performance checks:

- Inspect network panel.
- Confirm below-fold project images lazy-load.
- Confirm build output size is reasonable.

Art-direction checks:

- Compression does not introduce ugly banding in dark gradients.
- Scanline/noise overlays hide minor compression, not the artwork.

Checkpoint:

- `codex/CHECKPOINTS/10-performance.md`

---

## Phase 11 — GitHub Pages testing

Tasks:

- Push to GitHub.
- Confirm Pages source is GitHub Actions.
- Confirm workflow runs from `.github/workflows/pages.yml`.
- Check generated URL.
- Fix `VITE_BASE_PATH` if assets 404.

Code checks:

```bash
npm run build
```

Remote checks:

- GitHub Actions green.
- Pages URL loads.
- CSS and images load from the correct base path.
- ArtStation-origin images are local copies, not hotlinked.

Art-direction checks:

- Remote site visually matches local.
- No broken image placeholders except intentionally documented fallbacks.

Checkpoint:

- `codex/CHECKPOINTS/11-github-pages.md`

---

## Phase 12 — Final QA and handoff

Tasks:

- Run all final commands.
- Capture desktop/mobile screenshots.
- Document final URL, known issues, and next deploy target.
- Clean up unused files and console logs.

Final code checks:

```bash
npm run validate:content
npm run check
npm run build
```

Final art-direction checks:

- Black cinematic hacker feel survives every viewport.
- Mockup intent is clearly recognizable.
- ArtStation artwork is integrated as the real portfolio content.
- No copyrighted DeadSec/Watch Dogs assets or logos are used.

Checkpoint:

- `codex/CHECKPOINTS/12-final-handoff.md`

---

## Phase 13 — Future publishing system hardening

Tasks:

- Read `docs/PUBLISHING_NEW_CONTENT.md`.
- Verify adding an article does not require touching React component files.
- Verify adding a static page does not require touching React component files.
- Verify ArtStation re-imports do not overwrite curated copy from `content/project-overrides.json`.
- Keep `src/data/artstation-projects.json` as raw importer output.
- Keep Markdown content compact and image-led. Avoid generic blog styling.

Code checks:

```bash
npm run new:article -- "Codex Publishing Test"
npm run new:page -- "Codex Page Test"
npm run validate:content
npm run check
rm content/articles/codex-publishing-test.md content/pages/codex-page-test.md
npm run validate:content
```

Art-direction checks:

- Generated article and page routes look like hacked dossier screens, not default blog pages.
- Published content appears automatically in the correct sections.
- Draft content stays hidden from the UI.
- Hash routes work on GitHub Pages test deployment.

Checkpoint:

- `codex/CHECKPOINTS/13-publishing-system.md`

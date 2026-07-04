# QA checklist

## Build

- `npm run validate:content` passes.
- `npm run check` passes.
- `npm run build` passes.
- Preview build locally.

## Visual

- Desktop screenshot resembles `references/mockup/ARTISTWEBSITE.png` in composition and tone.
- Left hero title is dominant.
- Center ghost/binary element is low contrast and atmospheric.
- Right-side featured panel uses real artwork.
- Accent colors are sparse: green primary, magenta secondary.
- No clean SaaS/portfolio-template feel.

## Motion

- Glitch bursts are intermittent.
- Text remains readable.
- Reduced motion disables intense effects.
- No obvious scroll or hover jank.

## Content

- Projects come from Vlad's ArtStation or manually verified local entries.
- `Cat Walkman` is featured when present.
- No invented clients, awards, or claims.
- Links open safely and use `rel="noreferrer"` for external targets.

## Accessibility

- Keyboard navigation works.
- Focus states visible.
- Images have alt text.
- Page has one clear `h1`.
- Color contrast is acceptable.

## GitHub Pages

- Workflow green.
- Remote URL loads.
- CSS/assets load with the correct base path.
- No hotlinked ArtStation images in production.

## Publishing maintenance

- `npm run new:article -- "Smoke Test Article"` creates a draft under `content/articles/`.
- `npm run new:page -- "Smoke Test Page"` creates a draft under `content/pages/`.
- Draft content is hidden from article/page indexes.
- Changing `status: published` makes content appear without editing `src/App.tsx`.
- Project curation changes are in `content/project-overrides.json`, not hand-edited importer output.
- Article routes use `#/articles/<slug>` and page routes use `#/pages/<slug>` for GitHub Pages testing.

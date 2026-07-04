# Publishing new articles, pages, and curated project edits

This repository now has a content layer. Normal publishing should not require editing `src/App.tsx`.

## Articles

Create a new draft article:

```bash
npm run new:article -- "Building a Rainy Neon Alley in Houdini"
```

This creates:

```text
content/articles/building-a-rainy-neon-alley-in-houdini.md
```

The article appears at:

```text
#/articles/building-a-rainy-neon-alley-in-houdini
```

Draft articles are hidden from the live UI. When the article is ready, edit the frontmatter:

```yaml
status: published
```

To make an article the hero teaser, set:

```yaml
featured: true
heroTitle: BUILDING A|RAINY NEON ALLEY|IN HOUDINI_
```

Use `|` inside `heroTitle` to control line breaks in the hero card.

## Pages

Create a new draft page:

```bash
npm run new:page -- "Services"
```

This creates:

```text
content/pages/services.md
```

The page appears at:

```text
#/pages/services
```

When ready, change:

```yaml
status: published
```

Published pages automatically appear in the `_STATIC PAGES / DOSSIER LINKS` section, sorted by `order`.

## Images inside articles and pages

Use local paths under `public/`:

```markdown
![Lookdev pass](assets/artstation/cat-walkman/01-cat-walkman.jpg)
```

Do not start local image paths with `public/`. Use:

```text
assets/...
```

not:

```text
public/assets/...
```

Remote image URLs are supported for temporary testing, but final portfolio content should use local files so GitHub Pages is not hotlinking or depending on ArtStation availability.

## Curated project edits that survive ArtStation re-imports

Do not hand-edit imported project copy in:

```text
src/data/artstation-projects.json
```

That file can be overwritten by:

```bash
npm run import:artstation -- --user vladmaftei --pages 2 --max-assets-per-project 4
```

Put final project curation in:

```text
content/project-overrides.json
```

Example:

```json
{
  "cat-walkman": {
    "featured": true,
    "role": "VFX / 3D / AI / COMPOSITING",
    "description": "Final curated copy written by Vlad.",
    "tags": ["Featured", "Character", "Cyberpunk", "Compositing"]
  }
}
```

The key should be the project slug. Imported projects now include a `slug` field. For old/manual projects, use a lowercase hyphenated title.

## Required checks before pushing

Run these before every content push:

```bash
npm run validate:content
npm run check
npm run build
```

`npm run validate:content` checks that Markdown frontmatter is sane, local image paths exist, project overrides are valid, and imported project assets are present.

## GitHub Pages routing note

The site uses hash routes for articles and pages:

```text
#/articles/example-slug
#/pages/example-page
```

This is intentional for the test build because GitHub Pages can 404 on direct clean SPA paths unless fallback routing is added. Hash routes are less pretty, but they are reliable for early testing.

# ArtStation import guide

Source profile: `https://www.artstation.com/vladmaftei`

## Run

```bash
npm run import:artstation -- --user vladmaftei --pages 2 --max-assets-per-project 4
npm run validate:content
```

Output:

- Images: `public/assets/artstation/<project-slug>/...`
- Data: `src/data/artstation-projects.json`
- Raw cached JSON: `content/artstation-raw/`
- Curated, re-import-safe edits: `content/project-overrides.json`

## What the importer does

- Uses public ArtStation project JSON endpoints.
- Downloads public image assets only.
- Normalizes projects into the website data schema.
- Stores local copies so the website does not hotlink ArtStation images.

## What the importer must not do

- No login automation.
- No private asset access.
- No DRM/paywall bypass.
- No hidden token extraction.
- No hammering endpoints; keep delays between requests.

## If the public endpoint changes or Cloudflare blocks automation

Use `content/manual-projects.json` as the canonical fallback. Add manually verified public projects with this shape:

```json
[
  {
    "slug": "cat-walkman",
    "title": "Cat Walkman",
    "year": "2023",
    "role": "VFX / 3D / AI / COMPOSITING",
    "tags": ["3D", "Character", "Cyberpunk"],
    "description": "Short project description.",
    "cover": "assets/artstation/cat-walkman/cover.jpg",
    "gallery": ["assets/artstation/cat-walkman/cover.jpg"],
    "sourceUrl": "https://www.artstation.com/artwork/...",
    "featured": true
  }
]
```

Do not copy manual entries into `src/data/artstation-projects.json`. That file remains importer output and may be overwritten. The app uses manual projects automatically when imported ArtStation data is empty. Put final curated copy, roles, tags, or featured flags in `content/project-overrides.json` so future imports do not erase them. Then run:

```bash
npm run validate:content
npm run check
```

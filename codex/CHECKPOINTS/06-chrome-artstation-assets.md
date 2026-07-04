# Chrome ArtStation asset import

Date: 2026-07-03

## What changed

- Used the logged-in Chrome session to open public Vlad Maftei ArtStation project pages.
- Exported observed public ArtStation CDN images through Chrome page assets.
- Copied 37 downloaded images into `public/assets/artstation/<project-slug>/`.
- Updated `content/manual-projects.json` so available projects use local covers/galleries.
- Kept placeholder artwork only for pages that did not expose still images in the rendered page: `daft-punk-cover-art`, `breakdance`, and `x-particles-challenge-2018`.
- Strengthened and repositioned the ASCII/data portrait behind the hero name and featured project.

## Commands run

```bash
npm run validate:content
npm run build
```

Chrome checks:

- Confirmed `https://vladmaftei.artstation.com/projects/WXbbzQ` loads in Chrome.
- Exported observed page image assets without login bypasses, token extraction, or private/protected scraping.

## Code check result

- `npm run validate:content` passed.
- `npm run build` passed.
- Local browser check confirmed the featured project image resolves from `/assets/artstation/cat-walkman/...`.

## Art-direction check result

- Hero now keeps the readable dashboard layout while restoring the data-portrait presence from the original reference.
- Real project artwork now appears in the featured module and work grid where assets were available.

## Open issues

- Some projects are still placeholders because their rendered ArtStation pages did not expose downloadable still images through Chrome page assets.
- Future pass should optimize/resample large images and add any missing video thumbnails manually if desired.

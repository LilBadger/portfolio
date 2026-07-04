# Risk register for Codex build

## Build/runtime risks

- **Dependency lockfile must use public npm registry URLs.** The pack should never contain internal package-registry URLs. Check with:

  ```bash
  grep -R "applied-caas\|artifactory" package-lock.json package.json || true
  ```

- **Node version:** use Node 22 or newer matching `.nvmrc`. Vite currently requires modern Node. GitHub Actions is configured for Node 22.
- **This is a starter, not the finished production site.** Codex still has to run the phases and polish the build.

## ArtStation import risks

- ArtStation project JSON endpoints are public but undocumented and can change or block automated requests.
- The importer adds conservative headers, uses `album_id=all`, delays between requests, and stores local copies instead of hotlinking.
- If the endpoint fails, do not try login automation or protected scraping. Use the documented `content/manual-projects.json` fallback in `docs/ARTSTATION_IMPORT.md`.
- If Codex has no network access, the site will run with placeholders until assets are added manually.

## Art-direction risks

- The requested DeadSec / Watch Dogs 2 energy should be used only as broad mood reference. Do not copy logos, exact layouts, icons, or branded UI.
- Keep the site readable. The glitch treatment is there to sell the identity, not to obscure portfolio content.

## Publishing/maintenance risks

- **Do not publish by editing `src/App.tsx`.** Articles and pages must come from `content/articles/*.md` and `content/pages/*.md`.
- **Draft content is hidden.** If an article or page does not appear, check `status: published` first.
- **Project importer output is disposable.** `src/data/artstation-projects.json` can be overwritten. Final curated copy belongs in `content/project-overrides.json`.
- **GitHub Pages direct clean routes can 404.** The starter uses hash routes such as `#/articles/example` and `#/pages/about` for test deployment reliability.
- **Markdown support is intentionally lightweight.** The starter renderer supports headings, paragraphs, lists, links, bold text, inline code, code fences, blockquotes, horizontal rules, and images. If Codex adds richer Markdown, it must keep validation and performance checks working.

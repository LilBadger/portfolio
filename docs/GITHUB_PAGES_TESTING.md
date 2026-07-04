# GitHub Pages testing notes

The included workflow is `.github/workflows/pages.yml`.

## Repository setup

1. Create a repository on GitHub.
2. Push this project to `main`.
3. Go to repository **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Push again if needed to trigger the workflow.

## Vite base path

The workflow sets `VITE_BASE_PATH` to `/${{ github.event.repository.name }}/`, which is correct for a project Pages URL like:

```text
https://USERNAME.github.io/REPOSITORY_NAME/
```

For a root user site repository named:

```text
USERNAME.github.io
```

set `VITE_BASE_PATH=/` as a GitHub Actions variable, or edit `vite.config.ts` to use `/`.

## Local test for project path

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
npm run preview
```

Then verify CSS and images load with the subpath.

## Common failure modes

- Blank page: wrong Vite base path.
- CSS loads but images 404: data file contains `/assets/...` instead of `assets/...` relative paths.
- Workflow succeeds but Pages URL is old: check the Pages deployment history.
- ArtStation images missing remotely: confirm `public/assets/artstation/` was committed.

## Node version

Use Node 22 or newer. The repository includes `.nvmrc`, and the GitHub Pages workflow is pinned to Node 22.

## Article/page routes

Articles and static pages use hash routes intentionally:

```text
#/articles/example-article
#/pages/about
```

This avoids direct-route 404s during GitHub Pages testing. Do not convert to clean routes until a proper SPA fallback/deploy strategy is added.

# Phase 01 repository and environment

Date: 2026-07-03

## What changed

- Confirmed Node 22 is active locally and `.nvmrc` matches the workflow target.
- Confirmed GitHub Pages workflow uses `npm ci` without falling back to `npm install`.
- Confirmed Vite base path remains controlled by `VITE_BASE_PATH`.

## Commands run

```bash
node -v
npm -v
npm run build
```

## Code check result

- `npm run build` passed.
- Workflow install step is strict: `npm ci`.

## Art-direction check result

- No visual or layout files changed in this phase beyond the previously added project-detail/fallback wiring.
- Site still builds without ArtStation assets.

## Open issues

- The folder is not a Git repository, so no phase commit was created.

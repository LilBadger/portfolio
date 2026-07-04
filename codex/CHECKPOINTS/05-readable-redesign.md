# Readable portfolio redesign

Date: 2026-07-03

## What changed

- Replaced the scattered poster-style home composition with a readable portfolio dashboard.
- Added a persistent logical navigation bar: Work, Process, Articles, About, Contact.
- Simplified the hero to one clear identity block plus one featured project module.
- Removed the floating article module and phone mockup from the hero.
- Reworked work/process/articles/about/contact into a top-to-bottom reading path.
- Kept the cyberpunk/glitch style as visual treatment instead of layout structure.

## Commands run

```bash
npm run validate:content
npm run check
```

Browser checks:

- Desktop viewport: 1440x900
- Mobile viewport: 390x844

## Code check result

- `npm run validate:content` passed.
- `npm run check` passed.
- No horizontal overflow detected in desktop or mobile browser checks.

## Art-direction check result

- The old reference is now used as visual mood only: black canvas, scanlines, distressed type, acid green accents, dossier cards.
- Positioning no longer follows the reference poster layout.
- Navigation and content hierarchy are much easier to parse.

## Open issues

- Project imagery is still placeholder-based until real local artwork files are supplied.
- Contact still needs final email/social links before launch.

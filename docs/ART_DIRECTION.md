# Art direction — Vlad Maftei cyberpunk portfolio

Reference image: `references/mockup/ARTISTWEBSITE.png`

## Target mood

Dark, aggressive, glitchy, technical, cinematic. The feel should land near a hacker terminal / corrupted broadcast / surveillance UI / cyberpunk dossier. The user specifically wants a DeadSec-from-Watch-Dogs-2-type energy, but the implementation must stay original: no Ubisoft, Watch Dogs, DeadSec logos, copied iconography, or direct UI recreation.

## Composition from the mockup

- Huge negative space: mostly black, not a busy website background.
- Left hero identity block:
  - tiny system text in top-left.
  - small `_ARTIST` label.
  - massive distressed `VLAD MAFTEI` type, white/gray with grunge breakup.
  - role line: `VFX / 3D / AI / COMPOSITING`.
  - neon green CTA: `> ENTER PORTFOLIO_`.
- Center background:
  - ghost-like portrait/silhouette built from binary/dot matrix fragments.
  - low contrast, partly hidden, should never compete with the title.
- Right top:
  - `_FEATURED PROJECT` block.
  - project title in acid green.
  - grayscale scanline project artwork.
  - compact metadata list.
- Right lower/middle:
  - article/feature card, e.g. `BUILDING A CYBERPUNK BUCHAREST WITH AI_`.
  - magenta accent only for small moments.
- Far right:
  - skewed phone mockup showing the mobile version.
- Bottom/right:
  - subtle scroll prompt and micro UI marks.

## Palette

Use almost-black as the actual background. The design should be mostly monochrome, with accents used sparingly.

- Background: `#020303`, `#050606`, `#090a0a`
- Primary type: `#e7e7df`
- Muted type: `#808481`, `#a5a7a2`
- Acid green: `#a6ff00`, `#86d900`
- Hot magenta: `#ff1aa8`, `#d60f84`
- Error red should be rare and only for tiny UI noise.

## Typography

- Use monospace or square/technical type for UI labels.
- The hero name needs distressed/glitch treatment. Use CSS masks, duplicated pseudo-text, noise overlays, clipped spans, or SVG filters. Do not rely on a custom paid font unless the font license is included in the project. Never commit proprietary font files.
- The hierarchy should be brutally clear: name first, then role, then CTA, then project modules.

## Motion language

Animation should feel like corrupted video, signal loss, terminal data, and imperfect digital surveillance.

Approved motion motifs:

- Short glitch bursts, not constant chaos.
- Scanline drift.
- Binary rain/dither field.
- Horizontal data tearing on artwork.
- Random one-frame offsets on text duplicates.
- Neon cursor blink.
- Small UI marks flickering in and out.
- Subtle parallax reacting to pointer movement.

Avoid:

- Smooth glossy SaaS animations.
- Large bouncy easing.
- Excessive RGB split everywhere.
- Looped noise that makes text unreadable.
- Heavy libraries for simple effects.

## Artwork treatment

Vlad's ArtStation pieces are the content, not decorations. Use them with a cinematic UI treatment:

- Default: grayscale, high contrast, subtle scanlines/noise.
- On hover/focus: reveal more original color or higher brightness.
- Project thumbnails can have horizontal glitch slices, but keep the artwork readable.
- Use `Cat Walkman` as the featured project when present.
- Other expected project names include: `Daft Punk cover art`, `Philips Sensotouch`, `Breakdance`, `ReStart`, `Xparticles Challenge`, `Philips Product Renders`, `CC Digital Human Contest / Gellert Grindelwald`, `In Spirit`, `Quixel Mixer Contest`.

## Responsiveness

Desktop target is a 16:9 cinematic canvas similar to the mockup. Mobile should not be an afterthought:

- Mobile hero keeps the terminal feel, title, CTA, and featured project.
- Project panels become stacked dossier cards.
- Phone mockup can disappear on small screens because the page itself is the mobile design.
- Maintain readable tap targets and contrast.

## Acceptance art check

A screenshot should still read as the same direction when blurred or viewed from far away: black void, giant broken name on left, ghost data mass in center, project dossier UI on right, acid green/magenta accents, and visible glitch/scanline language.

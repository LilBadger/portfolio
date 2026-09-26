# Dynamic artist redesign

Date: 2026-09-26
Branch: redesign/dynamic-artist

## What changed

- Hero is now the work: a 20s reel (NOTLD, X-Particles, stills of other projects) rendered through a luminance-to-ASCII WebGL shader with a pointer "decode lens" that shows clean footage; glitch tearing bursts; pauses off-screen; poster + play button for reduced motion.
- Self-hosted fonts (JetBrains Mono + Archivo expanded) replace the system stack that fell back to Courier New on macOS/iOS.
- One real accent (`--signal` acid green) for interactive states; film grain overlay re-enabled; distressed mask on the name.
- Work section: featured grid (7 tiles, lead/tall/wide shapes) with hover-to-play loops and full-colour reveal instead of the darkening popup; `ls -la` archive list with a cursor-following preview; `--ai/--3d/--vfx/--product/--realtime` filters.
- Process section: drag-to-wipe breakdown slider on real same-shot NOTLD passes, plus four written steps (replaces title-only cards). Also shown on the NOTLD project page.
- About: profile facts (clients, contests, toolkit) on the homepage; richer About page. Duplicate sentence removed.
- Contact: large click-to-copy email, availability status, social links.
- Project pages: cinematic cover banner, deduplicated meta line, craft-based ghost terminal text, neutral HIDE TEXT button, "OPEN ARTSTATION" label.
- Terminal copy now describes the craft instead of ArtStation scraping / hacking tools.
- Content: merged the two X-Particles 2018 projects (old slug still routes, canonical points to the merged page); "Trips" and "Grindelwald Digital Human" titles; years added where verifiable.
- Philips Sensotouch: private YouTube embed (QoMyGzBPKAo) removed via override until the video is unlisted/public.
- Media pipeline: `npm run build:media` generates AVIF/WebP thumbnails, hover loops and the reel. Homepage images went from ~4.3 MB of full-size JPGs to ~0.3 MB; loops download only on first hover.
- Cross-document View Transitions morph a grid tile into the project cover (skipped for reduced motion and automated browsers).
- Lenis smooth scrolling for mouse/trackpad users; scanline "decode" reveal on scroll.

## Checks

- `npm run validate:content` passed.
- `npm run check` passed.
- Playwright: 31 passed, 3 skipped (desktop + mobile).
- Visual checks at 1440x900 and iPhone 13.

## Open issues

- Make the Sensotouch YouTube video unlisted/public (or supply the mp4) and remove the `videos: []` override.
- No portrait yet: the About page would benefit from one.
- Years unknown for Sensotouch, Philips renders and In Spirit (shown as `----`).
- Consider a hello@vladmaftei.com address instead of Gmail.

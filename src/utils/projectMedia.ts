import { assetPath } from './assetPath';

// Paths produced by scripts/build-media.mjs.
export function projectThumb(slug: string) {
  const base = (width: number, format: string) => assetPath(`assets/generated/thumbs/${slug}-${width}.${format}`);
  return {
    avif: `${base(640, 'avif')} 640w, ${base(1280, 'avif')} 1280w`,
    webp: `${base(640, 'webp')} 640w, ${base(1280, 'webp')} 1280w`,
    fallback: base(640, 'webp')
  };
}

export function projectLoop(slug: string) {
  return assetPath(`assets/generated/loops/${slug}.mp4`);
}

export function viewTransitionName(slug: string) {
  return `project-${slug}`;
}

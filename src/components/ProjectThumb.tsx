import { projectThumb } from '../utils/projectMedia';

export function ProjectThumb({
  slug,
  alt,
  sizes,
  eager = false,
  focus
}: {
  slug: string;
  alt: string;
  sizes: string;
  eager?: boolean;
  /** CSS object-position for crops. */
  focus?: string;
}) {
  const thumb = projectThumb(slug);
  return (
    <picture>
      <source type="image/avif" srcSet={thumb.avif} sizes={sizes} />
      <source type="image/webp" srcSet={thumb.webp} sizes={sizes} />
      <img src={thumb.fallback} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" style={focus ? { objectPosition: focus } : undefined} />
    </picture>
  );
}

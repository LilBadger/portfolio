import { useEffect, useState } from 'react';
import type { ReelShot } from './HeroReel';
import { projectHref } from '../utils/routes';

/** `$ now_playing: <project>` for the reel shot on screen; the name types in (~0.35s) at each cut. */
export function NowPlaying({ shot }: { shot: ReelShot | null }) {
  const [typed, setTyped] = useState(0);
  const title = shot?.title ?? '';

  useEffect(() => {
    setTyped(0);
    if (!title) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(title.length);
      return undefined;
    }
    const interval = window.setInterval(() => {
      setTyped((count) => {
        if (count >= title.length) {
          window.clearInterval(interval);
          return count;
        }
        return count + 1;
      });
    }, Math.min(22, 350 / title.length));
    return () => window.clearInterval(interval);
  }, [title]);

  if (!shot) return null;

  return (
    <a className="now-playing" href={projectHref(shot.slug)} aria-label={`Now playing in the reel: ${shot.title}. Open project`}>
      <span className="now-playing__prompt" aria-hidden="true">$ now_playing: </span>
      <span className="now-playing__title" aria-hidden="true">{title.slice(0, typed)}</span>
      <i aria-hidden="true">{typed < title.length ? '_' : ''}</i>
    </a>
  );
}

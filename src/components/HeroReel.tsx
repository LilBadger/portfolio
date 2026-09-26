import { useEffect, useRef, useState } from 'react';
import { assetPath } from '../utils/assetPath';

export type ReelShot = { start: number; end: number; slug: string; title: string; tools: string[] };
type ReelManifest = { duration: number; shots: ReelShot[] };

/** The hero reel. Reports which project is on screen (from reel.json) so the HUD can name it. */
export function HeroReel({
  sectionRef,
  onShotChange
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  onShotChange?: (shot: ReelShot) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [isPlaying, setIsPlaying] = useState(!reducedMotion);
  const [manifest, setManifest] = useState<ReelManifest | null>(null);
  // The beat-cut collage edit (scripts/build-collage-reel.py) is the hero. Previews: `?reel=classic`
  // (plain reel) and `?reel=doodle` (hand-drawn doodle montage, scripts/build-doodle-reel.py).
  const [variant] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('reel');
    return requested === 'classic' ? 'reel' : requested === 'doodle' ? 'reel-doodle' : 'reel-collage';
  });
  const [source] = useState(() => assetPath(`assets/generated/reel/${variant}-${window.matchMedia('(max-width: 760px)').matches ? 480 : 720}.mp4`));
  const poster = assetPath(`assets/generated/reel/${variant}-poster.jpg`);

  useEffect(() => {
    fetch(assetPath(`assets/generated/reel/${variant}.json`))
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ReelManifest | null) => setManifest(data))
      .catch(() => setManifest(null));
  }, [variant]);

  // Track the shot under the playhead; report only when it changes.
  useEffect(() => {
    if (!manifest || !onShotChange) return undefined;
    let last = -1;
    const update = () => {
      const time = videoRef.current?.currentTime ?? 0;
      const index = Math.max(0, manifest.shots.findIndex((shot) => time >= shot.start && time < shot.end));
      if (index !== last) {
        last = index;
        onShotChange(manifest.shots[index]);
      }
    };
    update();
    const interval = window.setInterval(update, 120);
    return () => window.clearInterval(interval);
  }, [manifest, onShotChange, isPlaying]);

  // Only decode video while the hero is on screen.
  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!isPlaying || !video || !section) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    });
    observer.observe(section);
    void video.play().catch(() => undefined);
    return () => observer.disconnect();
  }, [isPlaying, sectionRef]);

  return (
    <div className="hero-reel" aria-hidden={isPlaying ? true : undefined}>
      {isPlaying ? (
        <video ref={videoRef} className="hero-reel__video" src={source} poster={poster} muted loop playsInline autoPlay preload="auto" />
      ) : (
        <img className="hero-reel__video" src={poster} alt="" />
      )}
      <div className="hero-reel__shade" />
      {!isPlaying ? (
        <button className="hero-reel__play" type="button" onClick={() => setIsPlaying(true)}>
          &gt; PLAY REEL_
        </button>
      ) : null}
    </div>
  );
}

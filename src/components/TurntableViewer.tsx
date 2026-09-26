import { useEffect, useRef, useState } from 'react';
import type { Turntable } from '../data/projects';
import { assetPath } from '../utils/assetPath';

const frameSrc = (turntable: Turntable, frame: number) =>
  assetPath(`${turntable.dir}/${String(frame).padStart(2, '0')}.webp`);

/** Drag-to-rotate viewer for pre-rendered 360° turntables (one image per step). */
export function TurntableViewer({ turntables, title }: { turntables: Turntable[]; title: string }) {
  const [assetIndex, setAssetIndex] = useState(0);
  const [frame, setFrame] = useState(0);
  const [autoRotate, setAutoRotate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const drag = useRef<{ x: number; frame: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const turntable = turntables[assetIndex];
  const frames = turntable?.frames ?? 36;

  // Warm the cache for the active asset so dragging never shows a blank frame.
  useEffect(() => {
    if (!turntable) return;
    for (let index = 0; index < frames; index += 1) {
      const image = new Image();
      image.src = frameSrc(turntable, index);
    }
  }, [turntable, frames]);

  // Only spin while visible.
  useEffect(() => {
    const stage = stageRef.current;
    if (!autoRotate || !stage) return undefined;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setFrame((current) => (current + 1) % frames), 110);
    });
    observer.observe(stage);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [autoRotate, frames]);

  if (!turntable) return null;

  const step = (delta: number) => setFrame((current) => (current + delta + frames * 10) % frames);

  return (
    <figure className="turntable" data-reveal>
      <div className="turntable__assets" role="group" aria-label={`${title} scene assets`}>
        {turntables.map((item, index) => (
          <button
            type="button"
            key={item.dir}
            aria-pressed={index === assetIndex}
            onClick={() => {
              setAssetIndex(index);
              setFrame(0);
            }}
          >
            <span>_{String(index + 1).padStart(2, '0')}</span> {item.label}
          </button>
        ))}
      </div>

      <div
        className="turntable__stage"
        ref={stageRef}
        tabIndex={0}
        role="slider"
        aria-label={`Rotate ${turntable.label}`}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round((frame / frames) * 360)}
        aria-valuetext={`${Math.round((frame / frames) * 360)} degrees`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') step(1);
          else if (event.key === 'ArrowLeft') step(-1);
          else return;
          event.preventDefault();
          setAutoRotate(false);
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, frame };
          setAutoRotate(false);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const width = event.currentTarget.clientWidth || 1;
          const delta = Math.round(((event.clientX - drag.current.x) / width) * frames * 1.2);
          setFrame(((drag.current.frame - delta) % frames + frames) % frames);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <img src={frameSrc(turntable, frame)} alt={`${turntable.label}, ${Math.round((frame / frames) * 360)} degree view`} draggable={false} />
        <span className="turntable__hud" aria-hidden="true">
          <b>{String(Math.round((frame / frames) * 360)).padStart(3, '0')}°</b> drag to turn
        </span>
      </div>

      <figcaption>
        <span>{turntable.note ?? `${turntable.label}: the actual painted scene asset, ${frames} turntable views`}</span>
        <button type="button" onClick={() => setAutoRotate((current) => !current)} aria-pressed={autoRotate}>
          {autoRotate ? 'pause' : 'auto-rotate'}
        </button>
      </figcaption>
    </figure>
  );
}

import { useState } from 'react';
import type { BreakdownPair } from '../data/projects';
import { assetPath } from '../utils/assetPath';

const fileLabel = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_');

/** Drag-to-wipe comparison between two passes of the same shot. */
export function BreakdownSlider({ pairs, title }: { pairs: BreakdownPair[]; title: string }) {
  const [pairIndex, setPairIndex] = useState(0);
  const [position, setPosition] = useState(50);
  if (pairs.length === 0) return null;

  const { before, after } = pairs[pairIndex];

  return (
    <figure className="breakdown" data-reveal>
      <div className="breakdown__stages" role="group" aria-label={`${title} pipeline passes`}>
        {pairs.map((pair, index) => (
          <button
            type="button"
            key={`${pair.shot}-${pair.before.label}-${pair.after.label}`}
            aria-pressed={index === pairIndex}
            onClick={() => {
              setPairIndex(index);
              setPosition(50);
            }}
          >
            <span>_{String(index + 1).padStart(2, '0')} {pair.shot}:</span> {pair.before.label} <b aria-hidden="true">-&gt;</b> {pair.after.label}
          </button>
        ))}
      </div>

      <div className="breakdown__frame" style={{ '--wipe': `${position}%` } as React.CSSProperties}>
        <img className="breakdown__after" src={assetPath(after.src)} alt={after.label} />
        <img className="breakdown__before" src={assetPath(before.src)} alt={before.label} />
        <span className="breakdown__label breakdown__label--before" aria-hidden="true">{before.label}</span>
        <span className="breakdown__label breakdown__label--after" aria-hidden="true">{after.label}</span>
        <span className="breakdown__handle" aria-hidden="true" />
        <input
          className="breakdown__range"
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label={`Wipe between ${before.label} and ${after.label}`}
        />
      </div>
      <figcaption>
        <span>$ diff ./{fileLabel(before.label)} ./{fileLabel(after.label)}</span>
        <span>drag to wipe</span>
      </figcaption>
    </figure>
  );
}

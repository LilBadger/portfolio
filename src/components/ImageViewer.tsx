import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { assetPath } from '../utils/assetPath';

export type ViewerImage = {
  src: string;
  alt: string;
};

type ViewerMode = 'fit' | 'actual';

export function ImageViewer({
  images,
  activeIndex,
  onClose,
  onIndexChange
}: {
  images: ViewerImage[];
  activeIndex: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [mode, setMode] = useState<ViewerMode>('fit');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isOpen = activeIndex !== null && images.length > 0;
  const image = isOpen ? images[activeIndex] : undefined;

  const move = (direction: -1 | 1) => {
    if (activeIndex === null || images.length < 2) return;
    onIndexChange((activeIndex + direction + images.length) % images.length);
  };

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMode('fit');
    document.body.classList.add('image-viewer-open');
    document.documentElement.classList.add('image-viewer-open');
    closeButtonRef.current?.focus();

    return () => {
      document.body.classList.remove('image-viewer-open');
      document.documentElement.classList.remove('image-viewer-open');
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'Tab') {
        const controls = [...(viewerRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    if (!isOpen || activeIndex === null) return;
    setDimensions(null);
    viewportRef.current?.scrollTo({ left: 0, top: 0 });

    if (images.length > 1) {
      const adjacent = [
        images[(activeIndex - 1 + images.length) % images.length],
        images[(activeIndex + 1) % images.length]
      ];
      adjacent.forEach((item) => {
        const preload = new Image();
        preload.src = assetPath(item.src);
      });
    }
  }, [activeIndex, images, isOpen]);

  if (!isOpen || activeIndex === null || !image) return null;

  return createPortal(
    <div className="image-viewer" role="dialog" aria-modal="true" aria-label="Full-resolution image viewer" ref={viewerRef} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <header className="image-viewer__bar">
        <div className="image-viewer__identity">
          <strong>_IMAGE INSPECTOR</strong>
          <span>{String(activeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span>
        </div>
        <p title={image.alt}>{image.alt || `Artwork ${activeIndex + 1}`}</p>
        <div className="image-viewer__controls">
          <div className="image-viewer__modes" role="group" aria-label="Image scale">
            <button type="button" aria-pressed={mode === 'fit'} onClick={() => setMode('fit')}>FIT</button>
            <button type="button" aria-pressed={mode === 'actual'} onClick={() => setMode('actual')}>100%</button>
          </div>
          <button className="image-viewer__close" type="button" aria-label="Close image viewer" title="Close" onClick={onClose} ref={closeButtonRef}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </header>

      <div className={`image-viewer__viewport image-viewer__viewport--${mode}`} ref={viewportRef}>
        <img
          src={assetPath(image.src)}
          alt={image.alt}
          draggable="false"
          onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />
      </div>

      {images.length > 1 ? (
        <>
          <button className="image-viewer__step image-viewer__step--previous" type="button" aria-label="Previous image" title="Previous image" onClick={() => move(-1)}>
            <span aria-hidden="true">&larr;</span>
          </button>
          <button className="image-viewer__step image-viewer__step--next" type="button" aria-label="Next image" title="Next image" onClick={() => move(1)}>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </>
      ) : null}

      <footer className="image-viewer__status">
        <span>{mode === 'fit' ? 'FIT TO VIEWPORT' : 'ACTUAL PIXELS'}</span>
        <span>{dimensions ? `${dimensions.width} x ${dimensions.height} PX` : 'LOADING FULL RESOLUTION_'}</span>
      </footer>
    </div>,
    document.body
  );
}

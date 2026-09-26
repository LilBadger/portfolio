import { useEffect } from 'react';
import Lenis from 'lenis';

/** Lenis smooth scrolling for mouse/trackpad users; touch and reduced-motion keep native scrolling. */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    const lenis = new Lenis({ lerp: 0.12, anchors: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };
    frame = window.requestAnimationFrame(raf);
    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
}

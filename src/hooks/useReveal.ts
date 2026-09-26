import { useEffect } from 'react';

/** Adds `is-revealed` to `[data-reveal]` elements as they enter the viewport (scanline decode in CSS). */
export function useReveal(dependency: unknown) {
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-revealed'));
      return undefined;
    }
    document.documentElement.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [dependency]);
}

import { useEffect } from 'react';

/**
 * Marks `[data-reveal]` elements with a `data-revealed` attribute as they enter the viewport
 * (scanline decode in CSS). An attribute, not a class: React rewrites `className` on re-render
 * (e.g. when the work filters change), which would wipe a class added here and hide the element again.
 */
export function useReveal(dependency: unknown) {
  useEffect(() => {
    const reveal = (element: Element) => element.setAttribute('data-revealed', '');
    const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      elements.forEach(reveal);
      return undefined;
    }
    document.documentElement.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [dependency]);
}

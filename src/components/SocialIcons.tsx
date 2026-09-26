import type { ReactNode } from 'react';
import { socialLinks } from '../data/profile';

// Outline glyphs on a 24px grid so they share one stroke weight.
const icons: Record<string, ReactNode> = {
  ArtStation: (
    <path d="M0 17.723l2.027 3.505h.001a2.424 2.424 0 0 0 2.164 1.333h13.457l-2.792-4.838H0zm24 .025c0-.484-.143-.935-.388-1.314L15.728 2.728a2.424 2.424 0 0 0-2.142-1.289H9.419L21.598 22.54l1.92-3.325c.378-.637.482-.919.482-1.467zm-11.129-3.462L7.428 4.858l-5.444 9.428h10.887z" transform="translate(2.4 2.4) scale(0.8)" />
  ),
  LinkedIn: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5v6" />
      <circle cx="8" cy="7.6" r="0.4" />
      <path d="M12 16.5v-6M12 13.2c0-1.7 1.1-2.7 2.5-2.7s2.5 1 2.5 2.7v3.3" />
    </>
  ),
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.4" />
    </>
  ),
  X: <path d="M4 4l6.8 9.1L4.3 20H6l5.7-6.1L16.3 20H20l-7.1-9.5L19 4h-1.7l-5.3 5.7L7.7 4z" />
};

export function SocialIcons({ className = '' }: { className?: string }) {
  return (
    <ul className={`social-icons ${className}`.trim()} aria-label="Social profiles">
      {socialLinks.map((link) => (
        <li key={link.label}>
          <a href={link.href} target="_blank" rel="noreferrer" aria-label={`${link.label}: ${link.value}`} title={`${link.label} · ${link.value}`}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {icons[link.label]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}

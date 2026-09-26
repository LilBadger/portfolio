import { useState } from 'react';
import { availability, contactEmail, socialLinks } from '../data/profile';
import { AsciiBunny } from './AsciiBunny';

export function ContactBlock() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${contactEmail}`;
    }
  };

  return (
    <div className="contact-block" data-reveal>
      <p className="contact-block__status"><i aria-hidden="true" /> {availability}</p>
      <a className="contact-block__email" href={`mailto:${contactEmail}`}>{contactEmail}</a>
      <div className="contact-block__actions">
        <a className="button button--signal" href={`mailto:${contactEmail}`}>&gt; Send an email_</a>
        <button className="button" type="button" onClick={copyEmail} aria-live="polite">
          {copied ? 'copied ✓' : 'copy address'}
        </button>
      </div>
      <ul className="contact-block__links">
        {socialLinks.map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noreferrer">
              <span>{link.label}</span>
              <strong>{link.value}</strong>
            </a>
          </li>
        ))}
      </ul>
      <AsciiBunny key="contact-bunny" />
    </div>
  );
}

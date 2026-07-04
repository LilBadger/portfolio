import { useEffect, useState } from 'react';

const commands = [
  'ssh guest@vlad-maftei.net',
  'auth method: public_dossier_key',
  'cd /srv/portfolio/projects',
  'ls -lah ./artstation_cache',
  'find ./ -type f -name "*.jpg" | wc -l',
  'rsync -av --dry-run ./cat-walkman ./local_mirror',
  'curl -I /projects/trips/gallery.tar',
  'sha256sum ./daft-punk-cover-art/finalupscaled.jpg',
  'grep -R "sourceUrl" ./manifest.json',
  'tar -tvf ./client_preview_bundle.tar',
  'scp -C guest@vlad-maftei.net:/work/restart/*.jpg ./vault',
  'ffprobe ./breakdance/motion_ref.vimeo',
  'status: read-only tunnel active',
  'download queue: denied by portfolio firewall',
  'retrying with public ArtStation mirror',
  'wget --spider /assets/artstation/**/*.jpg',
  'checksum ok: project files indexed'
];

export function HeroTerminalLine() {
  const [commandIndex, setCommandIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const command = commands[commandIndex % commands.length];
    const isTyping = charIndex <= command.length;
    const delay = isTyping ? 42 + ((charIndex + commandIndex) % 5) * 12 : 1020;

    const timer = window.setTimeout(() => {
      if (isTyping) {
        setCharIndex((value) => value + 1);
        return;
      }

      setCharIndex(0);
      setCommandIndex((value) => value + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [charIndex, commandIndex]);

  const command = commands[commandIndex % commands.length];

  return (
    <p className="hero-terminal-line" aria-hidden="true">
      <span>$ {command.slice(0, charIndex)}</span><i>_</i>
    </p>
  );
}

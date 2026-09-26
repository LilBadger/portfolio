import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Each line doubles as a micro-credential: the tools and pipeline steps behind the work.
const commands = [
  'houdini -b ./sim/pyro_v012.hip --frames 1-240',
  'comfyui --queue ./ltx2_pose_guided_i2v.json',
  'qwen-edit --restyle ./notld/shot_014.png',
  'c4d -render ./xparticles/cells_v07.c4d',
  'blender -b ./grindelwald.blend -a',
  'substance --bake ./lookdev/hero_mat.spp',
  'unreal --render ./mixer/scene_final.umap',
  'ffmpeg -i ./renders/%04d.exr -c:v prores ./delivery.mov',
  'status: shot approved \u2713',
  'status: available for freelance + studio work'
];

export function HeroTerminalLine() {
  const [commandIndex, setCommandIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [lineWidth, setLineWidth] = useState(0);
  const lineRef = useRef<HTMLParagraphElement>(null);

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

  useLayoutEffect(() => {
    const line = lineRef.current;
    if (!line) return undefined;

    const updateWidth = () => setLineWidth(line.clientWidth);
    const observer = new ResizeObserver(updateWidth);
    updateWidth();
    observer.observe(line);

    return () => observer.disconnect();
  }, []);

  const command = commands[commandIndex % commands.length];
  const fittedFontSize = lineWidth > 0
    ? Math.max(9, Math.min(16, lineWidth / ((command.length + 3) * 0.62)))
    : 16;

  return (
    <p className="hero-terminal-line" aria-hidden="true" ref={lineRef} style={{ fontSize: `${fittedFontSize}px` }}>
      <span>$ {command.slice(0, charIndex)}</span><i>_</i>
    </p>
  );
}

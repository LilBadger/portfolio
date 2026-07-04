import { useEffect, useRef, useState } from 'react';

const bunnyFrames = [
  String.raw`  n   n
 ( -.- )
 (  -  )
 o(")(")`,
  String.raw`  n   n
 ( -.- )
 (  -  )
  (")_(")`,
  String.raw`  n   n
 ( o.o )
 (  -  )
 o(")(")`
];

type AsciiBunnyProps = {
  variant?: 'hero' | 'work' | 'project' | 'love';
};

export function AsciiBunny({ variant = 'hero' }: AsciiBunnyProps) {
  const bunnyRef = useRef<HTMLPreElement>(null);
  const [phase, setPhase] = useState<'entering' | 'idle' | 'fleeing'>('entering');
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (variant !== 'project') return undefined;

    const bunny = bunnyRef.current;
    if (!bunny) return undefined;

    const setRandomProjectPosition = () => {
      const position = 10 + Math.random() * 72;
      bunny.style.setProperty('--bunny-project-x', `${position.toFixed(2)}%`);
    };

    const onAnimationIteration = (event: AnimationEvent) => {
      if (event.animationName === 'bunnyProjectPeek') {
        setRandomProjectPosition();
      }
    };

    setRandomProjectPosition();
    bunny.addEventListener('animationiteration', onAnimationIteration);

    return () => bunny.removeEventListener('animationiteration', onAnimationIteration);
  }, [variant]);

  useEffect(() => {
    if (variant !== 'work') return undefined;

    let frame = 0;
    let currentY = 0;
    let targetY = 0;

    const updateTarget = () => {
      const bunny = bunnyRef.current;
      const section = bunny?.closest<HTMLElement>('.work-section');
      if (!bunny || !section) return;

      const sectionBounds = section.getBoundingClientRect();
      const bunnyBounds = bunny.getBoundingClientRect();
      const visibleFollowPoint = -sectionBounds.top + window.innerHeight * 0.38;
      const maxFollow = Math.max(0, section.offsetHeight - bunnyBounds.height - 180);

      targetY = Math.min(maxFollow, Math.max(0, visibleFollowPoint));
    };

    const followScroll = () => {
      const bunny = bunnyRef.current;
      updateTarget();
      currentY += (targetY - currentY) * 0.11;

      if (bunny) {
        bunny.style.setProperty('--bunny-follow-y', `${currentY.toFixed(2)}px`);
      }

      frame = window.requestAnimationFrame(followScroll);
    };

    followScroll();
    window.addEventListener('scroll', updateTarget, { passive: true });
    window.addEventListener('resize', updateTarget);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateTarget);
      window.removeEventListener('resize', updateTarget);
    };
  }, [variant]);

  useEffect(() => {
    const frameTimer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % bunnyFrames.length);
    }, phase === 'fleeing' ? 105 : 230);

    return () => window.clearInterval(frameTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'entering') return undefined;

    const enterDuration = variant === 'hero' || variant === 'love' ? 4700 : 2200;
    const enterTimer = window.setTimeout(() => setPhase('idle'), enterDuration);
    return () => window.clearTimeout(enterTimer);
  }, [phase, variant]);

  useEffect(() => {
    if (phase === 'fleeing') return undefined;

    const onPointerMove = (event: PointerEvent) => {
      const bounds = bunnyRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const bunnyCenterX = bounds.left + bounds.width / 2;
      const bunnyCenterY = bounds.top + bounds.height / 2;
      const distance = Math.hypot(event.clientX - bunnyCenterX, event.clientY - bunnyCenterY);

      if (distance < 190) {
        setPhase('fleeing');
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'fleeing') return undefined;

    const returnTimer = window.setTimeout(() => setPhase('entering'), 6200);
    return () => window.clearTimeout(returnTimer);
  }, [phase]);

  return (
    <pre
      ref={bunnyRef}
      className={`ascii-bunny ascii-bunny--${variant} ascii-bunny--${phase}`}
      aria-hidden="true"
    >
      {bunnyFrames[frameIndex]}
      {variant === 'love' ? (
        <span className="ascii-bunny__hearts" aria-hidden="true">
          <span>&lt;3</span>
          <span>&lt;3</span>
          <span>&lt;3</span>
        </span>
      ) : null}
    </pre>
  );
}

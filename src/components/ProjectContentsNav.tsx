import { useEffect, useRef, useState } from 'react';

export type ProjectContentsItem = {
  label: string;
  target: string;
};

function useActiveProjectSection(items: ProjectContentsItem[]) {
  const [activeTarget, setActiveTarget] = useState(items[0]?.target ?? '');

  useEffect(() => {
    if (items.length === 0) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const activationLine = Math.min(window.innerHeight * 0.34, 320);
      let current = items[0].target;

      for (const item of items) {
        const section = document.getElementById(item.target);
        if (section && section.getBoundingClientRect().top <= activationLine) current = item.target;
      }

      setActiveTarget(current);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [items]);

  return activeTarget;
}

function ContentsLinks({ items, activeTarget, onSelect }: { items: ProjectContentsItem[]; activeTarget: string; onSelect?: () => void }) {
  return (
    <div className="project-contents__links">
      {items.map((item, index) => (
        <a
          className={activeTarget === item.target ? 'is-active' : undefined}
          href={`#${item.target}`}
          aria-current={activeTarget === item.target ? 'location' : undefined}
          onClick={onSelect}
          key={item.target}
        >
          <span>{String(index + 1).padStart(2, '0')}</span> {item.label}
        </a>
      ))}
    </div>
  );
}

export function ProjectContentsNav({ items }: { items: ProjectContentsItem[] }) {
  const activeTarget = useActiveProjectSection(items);
  const mobileMenu = useRef<HTMLDetailsElement>(null);

  if (items.length === 0) return null;

  return (
    <nav className="project-contents" aria-label="Project contents">
      <div className="project-contents--desktop">
        <span className="project-contents__prompt">_INDEX</span>
        <ContentsLinks items={items} activeTarget={activeTarget} />
      </div>
      <details className="project-contents--mobile" ref={mobileMenu}>
        <summary>INDEX</summary>
        <ContentsLinks items={items} activeTarget={activeTarget} onSelect={() => mobileMenu.current?.removeAttribute('open')} />
      </details>
    </nav>
  );
}

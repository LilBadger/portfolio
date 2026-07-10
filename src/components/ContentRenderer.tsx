import { useState, type ReactNode } from 'react';
import { assetPath } from '../utils/assetPath';
import { imagePresentation } from '../utils/imagePreview';

type MarkdownBlock =
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'image'; alt: string; src: string }
  | { type: 'video'; title: string; url: string }
  | { type: 'code'; code: string }
  | { type: 'rule' };

export type ContentHeading = {
  id: string;
  level: 2 | 3 | 4;
  text: string;
};

export function contentHeadingId(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`_]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

export function extractContentHeadings(markdown: string): ContentHeading[] {
  return markdown.split(/\r?\n/).flatMap((line) => {
    const heading = line.trim().match(/^(#{2,4})\s+(.+)$/);
    if (!heading) return [];
    const level = heading[1].length as 2 | 3 | 4;
    return [{ id: contentHeadingId(heading[2]), level, text: heading[2] }];
  });
}

function toEmbedUrl(url: string): string {
  const youtubeShort = url.match(/^https:\/\/youtu\.be\/([^?&/]+)/);
  if (youtubeShort) return `https://www.youtube.com/embed/${youtubeShort[1]}`;

  const youtubeWatch = url.match(/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([^?&/]+)/);
  if (youtubeWatch) return `https://www.youtube.com/embed/${youtubeWatch[1]}`;

  return url;
}

function isLocalVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || url.startsWith('assets/');
}

function localVideoPoster(url: string): string {
  return url.replace(/\.(mp4|webm|mov)(\?.*)?$/i, '.poster.jpg');
}

function ContentVideo({ title, url }: { title: string; url: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const isLocal = isLocalVideoUrl(url);
  const poster = isLocal ? localVideoPoster(url) : undefined;

  return (
    <figure className="content-video">
      {isLocal && !isLoaded ? (
        <button className="project-video__poster content-video__poster" type="button" onClick={() => setIsLoaded(true)} aria-label={`Play ${title}`}>
          <img src={assetPath(poster!)} alt="" loading="lazy" />
          <span>PLAY WIP</span>
        </button>
      ) : isLocal ? (
        <video src={assetPath(url)} poster={assetPath(poster!)} controls autoPlay preload="metadata" />
      ) : (
        <iframe
          src={toEmbedUrl(url)}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
      <figcaption>{title}</figcaption>
    </figure>
  );
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === '---') {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: 'code', code: codeLines.join('\n') });
      index += 1;
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      blocks.push({ type: 'image', alt: image[1], src: image[2] });
      index += 1;
      continue;
    }

    const video = trimmed.match(/^::video\[([^\]]+)\]\(([^)]+)\)$/);
    if (video) {
      blocks.push({ type: 'video', title: video[1], url: video[2] });
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length as 2 | 3 | 4, text: heading[2] });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{2,4})\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith('```') &&
      !lines[index].trim().startsWith('>') &&
      !lines[index].trim().match(/^::video\[([^\]]+)\]\(([^)]+)\)$/) &&
      !lines[index].trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] && match[3]) {
      nodes.push(
        <a href={match[3]} target={match[3].startsWith('http') ? '_blank' : undefined} rel={match[3].startsWith('http') ? 'noreferrer' : undefined} key={`${match.index}-link`}>
          {match[2]}
        </a>
      );
    } else if (match[5]) {
      nodes.push(<strong key={`${match.index}-strong`}>{match[5]}</strong>);
    } else if (match[7]) {
      nodes.push(<code key={`${match.index}-code`}>{match[7]}</code>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function ContentRenderer({ body }: { body: string }) {
  const blocks = parseMarkdown(body);

  return (
    <div className="content-renderer">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4';
          return <Tag id={contentHeadingId(block.text)} key={index}>{renderInline(block.text)}</Tag>;
        }

        if (block.type === 'paragraph') {
          return <p key={index}>{renderInline(block.text)}</p>;
        }

        if (block.type === 'list') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
            </ul>
          );
        }

        if (block.type === 'quote') {
          return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
        }

        if (block.type === 'image') {
          const presentation = imagePresentation(block.src);
          return (
            <figure className="content-image scanline-image" key={index}>
              <a className="content-image__full-link" href={assetPath(block.src)} target="_blank" rel="noreferrer" aria-label={`Open ${block.alt || 'image'} full resolution`}>
                <img src={assetPath(presentation.src)} alt={block.alt} loading="lazy" width={presentation.width} height={presentation.height} />
                <span>OPEN FULL RESOLUTION</span>
              </a>
              {block.alt ? <figcaption>{block.alt}</figcaption> : null}
            </figure>
          );
        }

        if (block.type === 'video') {
          return <ContentVideo title={block.title} url={block.url} key={index} />;
        }

        if (block.type === 'code') {
          return <pre key={index}><code>{block.code}</code></pre>;
        }

        return <hr key={index} />;
      })}
    </div>
  );
}

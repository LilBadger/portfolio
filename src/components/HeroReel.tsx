import { useEffect, useRef, useState } from 'react';
import { assetPath } from '../utils/assetPath';

// Reel rendered live through a luminance -> ASCII pass (the Fugi visualizer idea as a WebGL shader).
// The pointer "decodes" the signal: a per-cell decode field (a small ping-pong texture) is painted
// along the pointer path and slowly decays. Each cell steps ASCII -> scrambling glyphs -> pixel
// block -> clean frame as its value rises, with a jittered threshold so the edge is blocky, not round.
const GLYPHS = ' .:-=+*#%@';

const vertexSource = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

// Decode field update, one fragment per character cell. Coordinates are bottom-up cell units.
const fieldSource = `#version 300 es
precision highp float;
uniform sampler2D uPrevious;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uDecay;
uniform float uTime;
out vec4 outValue;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return distance(p, a + ab * t);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float previous = texelFetch(uPrevious, ivec2(cell), 0).r;
  // Ragged, cell-quantised brush edge that re-rolls a few times a second.
  float jitter = (hash(cell + floor(uTime * 6.0)) - 0.5) * uRadius * 0.55;
  float d = segmentDistance(cell + 0.5, uFrom, uTo) + jitter;
  float brush = 1.0 - smoothstep(uRadius * 0.45, uRadius, d);
  // Decay with a little per-cell variation so the image corrupts back unevenly.
  float decay = uDecay * (0.6 + 0.8 * hash(cell * 1.7));
  outValue = vec4(max(previous - decay, brush), 0.0, 0.0, 1.0);
}`;

const renderSource = `#version 300 es
precision highp float;
uniform sampler2D uVideo;
uniform sampler2D uGlyphs;
uniform sampler2D uField;
uniform vec2 uResolution;
uniform vec2 uVideoSize;
uniform vec2 uFieldSize;
uniform float uCell;
uniform float uTime;
uniform float uGlitch;
uniform float uGlyphCount;
out vec4 outColor;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec2 coverUv(vec2 px) {
  vec2 uv = px / uResolution;
  float canvasAspect = uResolution.x / uResolution.y;
  float videoAspect = uVideoSize.x / uVideoSize.y;
  vec2 scale = canvasAspect > videoAspect ? vec2(1.0, videoAspect / canvasAspect) : vec2(canvasAspect / videoAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

float glyphAt(float index, vec2 inCell) {
  return texture(uGlyphs, vec2((index + inCell.x) / uGlyphCount, inCell.y)).r;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  // Horizontal data tearing during short glitch bursts.
  float band = floor(px.y / (uCell * 3.0));
  float tearOn = step(0.74, hash(band + floor(uTime * 18.0)));
  px.x += uGlitch * tearOn * (hash(band * 1.7 + floor(uTime * 24.0)) - 0.5) * uCell * 14.0;

  vec2 cell = floor(px / uCell);
  vec2 inCell = fract(px / uCell);
  vec3 cellColor = texture(uVideo, coverUv((cell + 0.5) * uCell)).rgb;
  float luminance = dot(cellColor, vec3(0.299, 0.587, 0.114));

  // Decode value for this cell, with a fixed per-cell threshold offset for a ragged front.
  vec2 fieldUv = vec2((cell.x + 0.5) / uFieldSize.x, 1.0 - (cell.y + 0.5) / uFieldSize.y);
  float decode = texture(uField, fieldUv).r + (hash2(cell) - 0.5) * 0.3;

  vec3 color;
  if (decode < 0.2) {
    // Encoded: the ASCII signal.
    float glyphIndex = floor(clamp(luminance * 1.3, 0.0, 0.999) * uGlyphCount);
    color = glyphAt(glyphIndex, inCell) * mix(vec3(0.65, 1.0, 0.0), cellColor * 1.7 + 0.04, 0.7);
  } else if (decode < 0.47) {
    // Scrambling: random glyphs cycling fast while the cell is being "solved".
    float scramble = floor(hash2(cell + floor(uTime * 22.0)) * uGlyphCount * 0.999);
    float lit = glyphAt(max(scramble, 3.0), inCell);
    color = lit * mix(vec3(0.65, 1.0, 0.0), vec3(1.0), step(0.85, hash2(cell * 3.1 + floor(uTime * 22.0))));
  } else if (decode < 0.68) {
    // Resolving: a flat pixel block of the cell's colour, with a hairline cell grid.
    float gap = step(0.9, max(inCell.x, inCell.y));
    color = cellColor * mix(1.08, 0.3, gap);
  } else {
    // Decoded: the clean frame.
    color = texture(uVideo, coverUv(px)).rgb;
    color *= 0.94 + 0.06 * sin(px.y * 3.14159);
  }

  outColor = vec4(color, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'compile');
  return shader;
}

function link(gl: WebGL2RenderingContext, fragment: string) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
  return program;
}

function glyphAtlas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size * GLYPHS.length;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff';
  context.font = `700 ${Math.round(size * 0.86)}px "JetBrains Mono Variable", monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  [...GLYPHS].forEach((glyph, index) => context.fillText(glyph, index * size + size / 2, size / 2 + 1));
  return canvas;
}

function startAsciiRenderer(canvas: HTMLCanvasElement, video: HTMLVideoElement, section: HTMLElement) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const fieldProgram = link(gl, fieldSource);
  const renderProgram = link(gl, renderSource);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  for (const program of [fieldProgram, renderProgram]) {
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  const makeTexture = (filter: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };

  const videoTexture = makeTexture(gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  const glyphTexture = makeTexture(gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphAtlas(32));

  // Ping-pong decode field, one texel per character cell.
  let fields: Array<{ texture: WebGLTexture; framebuffer: WebGLFramebuffer }> = [];
  let fieldSize = { width: 1, height: 1 };
  let readIndex = 0;
  const allocateFields = (width: number, height: number) => {
    for (const field of fields) {
      gl.deleteTexture(field.texture);
      gl.deleteFramebuffer(field.framebuffer);
    }
    fieldSize = { width, height };
    fields = [0, 1].map(() => {
      const texture = makeTexture(gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, framebuffer };
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const fieldUniform = (name: string) => gl.getUniformLocation(fieldProgram, name);
  const renderUniform = (name: string) => gl.getUniformLocation(renderProgram, name);
  const f = {
    previous: fieldUniform('uPrevious'), from: fieldUniform('uFrom'), to: fieldUniform('uTo'),
    radius: fieldUniform('uRadius'), decay: fieldUniform('uDecay'), time: fieldUniform('uTime')
  };
  const r = {
    video: renderUniform('uVideo'), glyphs: renderUniform('uGlyphs'), field: renderUniform('uField'),
    resolution: renderUniform('uResolution'), videoSize: renderUniform('uVideoSize'), fieldSize: renderUniform('uFieldSize'),
    cell: renderUniform('uCell'), time: renderUniform('uTime'), glitch: renderUniform('uGlitch'), glyphCount: renderUniform('uGlyphCount')
  };

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, lastMove: -10_000, previousX: 0, previousY: 0 };
  let cellSize = 9;
  let frame = 0;
  let running = false;
  let glitchUntil = 0;
  let nextGlitch = performance.now() + 2500;
  let lastTime = performance.now();

  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    cellSize = Math.round((canvas.width < 900 * dpr ? 7 : 9) * dpr);
    allocateFields(Math.ceil(canvas.width / cellSize), Math.ceil(canvas.height / cellSize));
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    pointer.targetX = (event.clientX - bounds.left) * dpr;
    pointer.targetY = (event.clientY - bounds.top) * dpr;
    pointer.lastMove = performance.now();
  };
  section.addEventListener('pointermove', onPointerMove);

  const render = (now: number) => {
    frame = window.requestAnimationFrame(render);
    const width = canvas.width;
    const height = canvas.height;
    const delta = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // With no recent pointer input the decode wanders on its own (touch screens, idle desktop).
    if (now - pointer.lastMove > 2600) {
      const t = now / 1000;
      pointer.targetX = width * (0.6 + 0.24 * Math.sin(t * 0.43));
      pointer.targetY = height * (0.48 + 0.3 * Math.sin(t * 0.61 + 1.2));
    }
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x += (pointer.targetX - pointer.x) * 0.2;
    pointer.y += (pointer.targetY - pointer.y) * 0.2;

    if (now > nextGlitch) {
      glitchUntil = now + 160 + Math.random() * 140;
      nextGlitch = now + 2800 + Math.random() * 3600;
    }

    // 1. Update the decode field along the pointer's path this frame.
    const next = 1 - readIndex;
    gl.useProgram(fieldProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fields[next].framebuffer);
    gl.viewport(0, 0, fieldSize.width, fieldSize.height);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fields[readIndex].texture);
    gl.uniform1i(f.previous, 2);
    const toCells = (x: number, y: number) => [x / cellSize, fieldSize.height - y / cellSize] as const;
    gl.uniform2f(f.from, ...toCells(pointer.previousX, pointer.previousY));
    gl.uniform2f(f.to, ...toCells(pointer.x, pointer.y));
    gl.uniform1f(f.radius, Math.max(6, (Math.min(width, height) * 0.13) / cellSize));
    gl.uniform1f(f.decay, delta * 0.42);
    gl.uniform1f(f.time, now / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    readIndex = next;

    // 2. Draw the frame.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(renderProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    if (video.readyState >= 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, glyphTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fields[readIndex].texture);
    gl.uniform1i(r.video, 0);
    gl.uniform1i(r.glyphs, 1);
    gl.uniform1i(r.field, 2);
    gl.uniform1f(r.glyphCount, GLYPHS.length);
    gl.uniform2f(r.resolution, width, height);
    gl.uniform2f(r.videoSize, video.videoWidth || 16, video.videoHeight || 9);
    gl.uniform2f(r.fieldSize, fieldSize.width, fieldSize.height);
    gl.uniform1f(r.cell, cellSize);
    gl.uniform1f(r.time, now / 1000);
    gl.uniform1f(r.glitch, now < glitchUntil ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      frame = window.requestAnimationFrame(render);
    },
    stop() {
      running = false;
      window.cancelAnimationFrame(frame);
    },
    destroy() {
      this.stop();
      resizeObserver.disconnect();
      section.removeEventListener('pointermove', onPointerMove);
    }
  };
}

export function HeroReel({ sectionRef }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [isPlaying, setIsPlaying] = useState(!reducedMotion);
  const [hasShader, setHasShader] = useState(false);
  const [source] = useState(() => assetPath(`assets/generated/reel/reel-${window.matchMedia('(max-width: 760px)').matches ? 480 : 720}.mp4`));
  const poster = assetPath('assets/generated/reel/reel-poster.jpg');

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!isPlaying || !video || !canvas || !section) return undefined;

    let renderer: ReturnType<typeof startAsciiRenderer> = null;
    let cancelled = false;

    document.fonts.load('700 28px "JetBrains Mono Variable"').catch(() => undefined).finally(() => {
      if (cancelled) return;
      try {
        renderer = startAsciiRenderer(canvas, video, section);
      } catch {
        renderer = null;
      }
      setHasShader(Boolean(renderer));
      renderer?.start();
    });

    // Only spend GPU and decode time while the hero is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        void video.play().catch(() => undefined);
        renderer?.start();
      } else {
        video.pause();
        renderer?.stop();
      }
    });
    observer.observe(section);
    void video.play().catch(() => undefined);

    return () => {
      cancelled = true;
      observer.disconnect();
      renderer?.destroy();
    };
  }, [isPlaying, sectionRef]);

  return (
    <div className={`hero-reel${hasShader ? ' hero-reel--shader' : ''}`} aria-hidden={isPlaying ? true : undefined}>
      {isPlaying ? (
        <video ref={videoRef} className="hero-reel__video" src={source} poster={poster} muted loop playsInline autoPlay preload="auto" />
      ) : (
        <img className="hero-reel__video" src={poster} alt="" />
      )}
      <canvas ref={canvasRef} className="hero-reel__canvas" />
      <div className="hero-reel__shade" />
      {!isPlaying ? (
        <button className="hero-reel__play" type="button" onClick={() => setIsPlaying(true)}>
          &gt; PLAY REEL_
        </button>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { assetPath } from '../utils/assetPath';

// Reel rendered live through a luminance -> ASCII pass (the Fugi visualizer idea as a WebGL shader).
// A "decode lens" follows the pointer and shows the clean full-colour footage underneath.
const GLYPHS = ' .:-=+*#%@';

const vertexSource = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D uVideo;
uniform sampler2D uGlyphs;
uniform vec2 uResolution;
uniform vec2 uVideoSize;
uniform vec2 uPointer;
uniform float uCell;
uniform float uRadius;
uniform float uTime;
uniform float uGlitch;
uniform float uGlyphCount;
out vec4 outColor;

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec2 coverUv(vec2 px) {
  vec2 uv = px / uResolution;
  float canvasAspect = uResolution.x / uResolution.y;
  float videoAspect = uVideoSize.x / uVideoSize.y;
  vec2 scale = canvasAspect > videoAspect ? vec2(1.0, videoAspect / canvasAspect) : vec2(canvasAspect / videoAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
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
  float glyphIndex = floor(clamp(luminance * 1.3, 0.0, 0.999) * uGlyphCount);
  float glyph = texture(uGlyphs, vec2((glyphIndex + inCell.x) / uGlyphCount, inCell.y)).r;
  vec3 ascii = glyph * mix(vec3(0.65, 1.0, 0.0), cellColor * 1.7 + 0.04, 0.7);

  vec3 clean = texture(uVideo, coverUv(px)).rgb;
  clean *= 0.9 + 0.1 * sin(px.y * 3.14159);

  float dist = distance(px, uPointer);
  float lens = 1.0 - smoothstep(uRadius * 0.55, uRadius, dist);
  float rim = lens * smoothstep(uRadius * 0.45, uRadius * 0.7, dist);
  vec3 color = mix(ascii, clean, lens);
  color += rim * vec3(0.35, 0.0, 0.22) * uGlitch;
  color.r += rim * 0.08;

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

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const makeTexture = (unit: number, filter: number) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };

  makeTexture(0, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  makeTexture(1, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphAtlas(32));

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(uniform('uVideo'), 0);
  gl.uniform1i(uniform('uGlyphs'), 1);
  gl.uniform1f(uniform('uGlyphCount'), GLYPHS.length);
  const uResolution = uniform('uResolution');
  const uVideoSize = uniform('uVideoSize');
  const uPointer = uniform('uPointer');
  const uCell = uniform('uCell');
  const uRadius = uniform('uRadius');
  const uTime = uniform('uTime');
  const uGlitch = uniform('uGlitch');

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, lastMove: -10_000 };
  let frame = 0;
  let running = false;
  let glitchUntil = 0;
  let nextGlitch = performance.now() + 2500;

  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
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

    // With no recent pointer input the lens drifts on its own path (touch screens, idle desktop).
    if (now - pointer.lastMove > 2600) {
      const t = now / 1000;
      pointer.targetX = width * (0.66 + 0.2 * Math.sin(t * 0.37));
      pointer.targetY = height * (0.5 + 0.26 * Math.sin(t * 0.53 + 1.2));
    }
    pointer.x += (pointer.targetX - pointer.x) * 0.12;
    pointer.y += (pointer.targetY - pointer.y) * 0.12;

    if (now > nextGlitch) {
      glitchUntil = now + 160 + Math.random() * 140;
      nextGlitch = now + 2800 + Math.random() * 3600;
    }

    if (video.readyState >= 2) {
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }

    gl.uniform2f(uResolution, width, height);
    gl.uniform2f(uVideoSize, video.videoWidth || 16, video.videoHeight || 9);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.uniform1f(uCell, Math.round((width < 900 * dpr ? 7 : 9) * dpr));
    gl.uniform1f(uRadius, Math.min(width, height) * 0.34);
    gl.uniform1f(uTime, now / 1000);
    gl.uniform1f(uGlitch, now < glitchUntil ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  return {
    start() {
      if (running) return;
      running = true;
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

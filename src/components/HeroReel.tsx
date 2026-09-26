import { useEffect, useRef, useState } from 'react';
import { assetPath } from '../utils/assetPath';

// The reel plays clean. Every few seconds a band or patch of the frame dissolves into ASCII
// (the Fugi luminance-to-glyph idea) and back. Cells switch on individually along an eased
// envelope, so it reads as a soft dissolve rather than a flash.
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
uniform float uCell;
uniform float uGlyphCount;
uniform vec4 uRegion;     // x0, y0, x1, y1 in 0-1 screen space (top-left origin)
uniform float uAmount;    // 0-1 eased event envelope
uniform float uSeed;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec2 coverUv(vec2 px) {
  vec2 uv = px / uResolution;
  float canvasAspect = uResolution.x / uResolution.y;
  float videoAspect = uVideoSize.x / uVideoSize.y;
  vec2 scale = canvasAspect > videoAspect ? vec2(1.0, videoAspect / canvasAspect) : vec2(canvasAspect / videoAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec3 clean = texture(uVideo, coverUv(px)).rgb;

  if (uAmount <= 0.0) {
    outColor = vec4(clean, 1.0);
    return;
  }

  vec2 cell = floor(px / uCell);
  vec2 inCell = fract(px / uCell);
  vec2 cellUv = (cell + 0.5) * uCell / uResolution;

  // Soft, ragged region edge: cells nearer the edge need a higher envelope to switch.
  vec2 fromEdge = min(cellUv - uRegion.xy, uRegion.zw - cellUv) / max(uRegion.zw - uRegion.xy, vec2(1e-3));
  float inside = clamp(min(fromEdge.x, fromEdge.y) * 4.0, 0.0, 1.0);
  float threshold = hash(cell + uSeed) * 0.75 + (1.0 - inside) * 0.6;

  if (inside <= 0.0 || uAmount < threshold) {
    outColor = vec4(clean, 1.0);
    return;
  }

  vec3 cellColor = texture(uVideo, coverUv((cell + 0.5) * uCell)).rgb;
  float luminance = dot(cellColor, vec3(0.299, 0.587, 0.114));
  float glyphIndex = floor(clamp(luminance * 1.3, 0.0, 0.999) * uGlyphCount);
  float glyph = texture(uGlyphs, vec2((glyphIndex + inCell.x) / uGlyphCount, inCell.y)).r;
  // Keep the footage's own colours so the glyphs feel like part of the image, with a hint of signal green.
  vec3 ink = mix(vec3(0.65, 1.0, 0.0), cellColor * 1.6 + 0.05, 0.8);
  // Glyphs over a dimmed copy of the footage, not a black box, so the frame stays readable.
  outColor = vec4(mix(clean * 0.38, ink, glyph), 1.0);
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

type GlitchEvent = { start: number; region: [number, number, number, number]; seed: number };

const EVENT_IN = 380;
const EVENT_HOLD = 650;
const EVENT_OUT = 700;
const EVENT_LENGTH = EVENT_IN + EVENT_HOLD + EVENT_OUT;

const smooth = (value: number) => value * value * (3 - 2 * value);

function envelope(event: GlitchEvent | null, now: number) {
  if (!event) return 0;
  const t = now - event.start;
  if (t < 0 || t > EVENT_LENGTH) return 0;
  if (t < EVENT_IN) return smooth(t / EVENT_IN);
  if (t < EVENT_IN + EVENT_HOLD) return 1;
  return smooth(1 - (t - EVENT_IN - EVENT_HOLD) / EVENT_OUT);
}

// Mostly horizontal bands, sometimes a rectangular patch.
function randomEvent(now: number): GlitchEvent {
  const height = 0.1 + Math.random() * 0.16;
  const y0 = 0.08 + Math.random() * (0.84 - height);
  if (Math.random() < 0.35) {
    const width = 0.25 + Math.random() * 0.25;
    const x0 = 0.05 + Math.random() * (0.9 - width);
    return { start: now, region: [x0, y0, x0 + width, y0 + height * 1.6], seed: Math.random() * 100 };
  }
  return { start: now, region: [-0.05, y0, 1.05, y0 + height], seed: Math.random() * 100 };
}

function startAsciiRenderer(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
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

  const makeTexture = (unit: number) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };

  makeTexture(0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  makeTexture(1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphAtlas(32));

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(uniform('uVideo'), 0);
  gl.uniform1i(uniform('uGlyphs'), 1);
  gl.uniform1f(uniform('uGlyphCount'), GLYPHS.length);
  const uResolution = uniform('uResolution');
  const uVideoSize = uniform('uVideoSize');
  const uCell = uniform('uCell');
  const uRegion = uniform('uRegion');
  const uAmount = uniform('uAmount');
  const uSeed = uniform('uSeed');

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let frame = 0;
  let running = false;
  let event: GlitchEvent | null = null;
  let nextEvent = performance.now() + 3000;

  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const render = (now: number) => {
    frame = window.requestAnimationFrame(render);

    if (now >= nextEvent) {
      event = randomEvent(now);
      nextEvent = now + EVENT_LENGTH + 6000 + Math.random() * 4000;
    }

    if (video.readyState >= 2) {
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }

    const width = canvas.width;
    gl.uniform2f(uResolution, width, canvas.height);
    gl.uniform2f(uVideoSize, video.videoWidth || 16, video.videoHeight || 9);
    gl.uniform1f(uCell, Math.round((width < 900 * dpr ? 7 : 9) * dpr));
    gl.uniform4f(uRegion, ...(event?.region ?? [0, 0, 0, 0]));
    gl.uniform1f(uAmount, envelope(event, now));
    gl.uniform1f(uSeed, event?.seed ?? 0);
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
        renderer = startAsciiRenderer(canvas, video);
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

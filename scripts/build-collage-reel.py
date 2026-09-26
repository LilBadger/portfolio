#!/usr/bin/env python3
"""Collage / lyric-edit version of the hero reel.

Beat-cut edit (120 BPM, 12 frames per beat at 24 fps) of the recent work with per-cut photo
treatments (high-contrast black and white, stacked duplicates, tiled grids, circle crops,
acid-green duotone) and no text: the work carries it.

Outputs (public/assets/generated/reel/):
  reel-collage-720.mp4, reel-collage-480.mp4, reel-collage-poster.jpg, reel-collage.json

Needs ffmpeg, Pillow and numpy.   python3 scripts/build-collage-reel.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'
OUT = PUB / 'assets/generated/reel'
W, H, FPS = 1280, 720, 24
BEAT = 12  # frames per beat (120 BPM)
ACID = (166, 255, 0)
RNG = np.random.default_rng(7)


NOTLD = 'assets/projects/night-of-the-living-dead-ltx-contest/night-of-the-living-dead-final.mp4'
F1R = 'assets/projects/f1r-live-video/f1r-live-final.mp4'
FOREST = 'assets/projects/dark-forest/dark-forest-final.mp4'
INK = 'assets/projects/dark-forest/look-dev-ink-edit.mp4'
FUGI = 'assets/projects/fugi-visualizer'


# ---------------------------------------------------------------- sources

def decode(path, start, frames, focus=None):
    """Decode `frames` frames of a clip, cover-cropped to W x H (optionally reframed)."""
    zoom = (focus or {}).get('zoom', 1.0)
    sw, sh = round(W * zoom), round(H * zoom)
    if focus:
        x = f"min(max(iw*{focus['x']}-ow/2\\,0)\\,iw-ow)"
        y = f"min(max(ih*{focus['y']}-oh/2\\,0)\\,ih-oh)"
    else:
        x, y = '(iw-ow)/2', '(ih-oh)/2'
    vf = f'scale={sw}:{sh}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}:{x}:{y},fps={FPS},format=rgb24'
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(PUB / path), '-frames:v', str(frames), '-vf', vf, '-f', 'rawvideo', '-'],
        check=True, capture_output=True).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    if len(arr) < frames:  # pad by holding the last frame
        arr = np.concatenate([arr, np.repeat(arr[-1:], frames - len(arr), 0)])
    return arr


def still(path, frames, drift=0.06):
    """A still with a slow push-in."""
    src = Image.open(PUB / path).convert('RGB')
    scale = max(W / src.width, H / src.height) * (1 + drift)
    base = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    out = []
    for i in range(frames):
        z = 1 + drift * (1 - i / max(1, frames - 1))
        cw, ch = round(W * z), round(H * z)
        cw, ch = min(cw, base.width), min(ch, base.height)
        l, t = (base.width - cw) // 2, (base.height - ch) // 2
        out.append(np.asarray(base.crop((l, t, l + cw, t + ch)).resize((W, H), Image.BILINEAR)))
    return np.stack(out)


# ---------------------------------------------------------------- treatments

def bw(f):
    # Auto-levels per frame, then a hard S-curve, so dark footage still reads as punchy black and white.
    g = f[..., 0] * 0.299 + f[..., 1] * 0.587 + f[..., 2] * 0.114
    lo, hi = np.percentile(g[::4, ::4], (2, 99.5))
    g = np.clip((g - lo) / max(hi - lo, 24), 0, 1)
    g = np.clip((g - 0.5) * 1.5 + 0.5, 0, 1) * 255
    return np.repeat(g[..., None], 3, 2).astype(np.uint8)


def duotone(f):
    g = (f[..., 0] * 0.299 + f[..., 1] * 0.587 + f[..., 2] * 0.114) / 255
    g = np.clip((g - 0.15) * 1.6, 0, 1)[..., None]
    return (g * np.array(ACID) + (1 - g) * np.array([2, 6, 2])).astype(np.uint8)


def stack(frames, i, rows):
    """Same shot repeated in horizontal strips, each strip a frame behind the one above."""
    band = H // rows
    out = np.empty((H, W, 3), np.uint8)
    for r in range(rows):
        src = frames[max(0, i - r * 2)]
        top = (H - band) // 2
        out[r * band:(r + 1) * band] = src[top:top + band]
    out[rows * band:] = 0
    for r in range(1, rows):
        out[r * band - 2:r * band + 2] = 0
    return out


def grid(frames, i, n=2):
    tile = np.asarray(Image.fromarray(frames[i]).resize((W // n, H // n), Image.BILINEAR))
    out = np.zeros((H, W, 3), np.uint8)
    for r in range(n):
        for c in range(n):
            src = frames[max(0, i - (r * n + c))]
            t = np.asarray(Image.fromarray(src).resize((W // n, H // n), Image.BILINEAR)) if (r or c) else tile
            out[r * (H // n):(r + 1) * (H // n), c * (W // n):(c + 1) * (W // n)] = t
    out[H // 2 - 2:H // 2 + 2] = 0
    out[:, W // 2 - 2:W // 2 + 2] = 0
    return out


def circle(f, i, total):
    """Black frame, circular black-and-white crop, rotating ring of text (the 'clock' shot)."""
    canvas = Image.new('RGB', (W, H), (4, 5, 5))
    radius = int(H * 0.36)
    cx, cy = W // 2, H // 2
    disc = Image.fromarray(bw(f)).crop((cx - radius, cy - radius, cx + radius, cy + radius))
    mask = Image.new('L', disc.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, disc.width - 1, disc.height - 1), fill=255)
    canvas.paste(disc, (cx - radius, cy - radius), mask)
    d = ImageDraw.Draw(canvas)
    d.ellipse((cx - radius - 6, cy - radius - 6, cx + radius + 6, cy + radius + 6), outline=(240, 242, 236), width=3)
    # A second thin ring that slowly widens, instead of text.
    grow = 18 + int(22 * i / max(1, total - 1))
    d.ellipse((cx - radius - grow, cy - radius - grow, cx + radius + grow, cy + radius + grow), outline=(110, 116, 110), width=1)
    return np.asarray(canvas)


# ---------------------------------------------------------------- edit

def card(slug, source, beats, segments):
    return dict(slug=slug, source=source, beats=beats, segments=segments)


FOREST_FOCUS = {'x': 0.35, 'y': 0.6, 'zoom': 1.5}
EDIT = [
    card('f1r-live-video', ('clip', F1R, 150.0), 2, [(2, 'circle')]),
    card('dark-forest', ('clip', FOREST, 10.0, FOREST_FOCUS), 2, [(1, 'bw'), (1, 'color')]),
    card('dark-forest', ('clip', FOREST, 12.0, FOREST_FOCUS), 1.5, [(1.5, 'stack2')]),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 30.4), 3, [(1, 'color'), (1, 'bw'), (1, 'stack3')]),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 66.0), 2, [(1, 'bw'), (1, 'grid')]),
    card('f1r-live-video', ('clip', F1R, 158.0), 2, [(2, 'bw')]),
    card('f1r-live-video', ('clip', F1R, 166.0), 1.5, [(1.5, 'duotone')]),
    card('daft-punk-cover-art', ('still', 'assets/artstation/daft-punk-cover-art/01-vlx-maftei-finalupscaled.jpg'), 2, [(1, 'color'), (1, 'grid')]),
    card('cat-walkman', ('still', 'assets/artstation/cat-walkman/01-vlx-maftei-catwalkmanhighrezblurred2.jpg'), 2, [(2, 'stack2')]),
    card('trips', ('still', 'assets/artstation/trips/07-vlx-maftei-landscapes-07.jpg'), 1, [(1, 'bw')]),
    card('trips', ('still', 'assets/artstation/trips/04-vlx-maftei-landscapes-04.jpg'), 1.5, [(1.5, 'color')]),
    card('dark-forest', ('clip', INK, 12.0), 2, [(1, 'color'), (1, 'stack3')]),
    card('fugi-visualizer', ('still', f'{FUGI}/f1r-character-glitch.png'), 1, [(1, 'color')]),
    card('fugi-visualizer', ('still', f'{FUGI}/reference-tongue-in.png'), 1.5, [(1.5, 'bw')]),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 100.0), 3, [(1, 'color'), (1, 'bw'), (1, 'grid')]),
    card('f1r-live-video', ('clip', F1R, 184.0), 2, [(2, 'circle')]),
    card('dark-forest', ('clip', FOREST, 20.0, FOREST_FOCUS), 2, [(1, 'color'), (1, 'stack2')]),
]

TITLES = {}
TOOLS = {'dark-forest': ['Hunyuan3D', 'Kimodo', 'Blender'], 'f1r-live-video': ['LTX-2.3', 'Pi3X point cloud'], 'fugi-visualizer': ['Codex', 'WebGL'], 'trips': ['Flux', 'Runway']}


def load_titles():
    projects = json.loads((ROOT / 'content/manual-projects.json').read_text())
    overrides = json.loads((ROOT / 'content/project-overrides.json').read_text())
    for p in projects:
        merged = {**p, **overrides.get(p['slug'], {})}
        TITLES[p['slug']] = (merged['title'], TOOLS.get(p['slug'], merged.get('tools', [])[:2]))


def render_card(c):
    n = round(c['beats'] * BEAT)
    src = c['source']
    frames = decode(src[1], src[2], n, src[3] if len(src) > 3 else None) if src[0] == 'clip' else still(src[1], n)
    # Treatment per frame, switching on the beat.
    treatments = []
    for beats, t in c['segments']:
        treatments += [t] * round(beats * BEAT)
    treatments = (treatments + [treatments[-1]] * n)[:n]
    out = []
    for i in range(n):
        f = frames[i]
        t = treatments[i]
        if t == 'bw':
            img = bw(f)
        elif t == 'duotone':
            img = duotone(f)
        elif t == 'stack2':
            img = stack(frames, i, 2)
        elif t == 'stack3':
            img = stack(frames, i, 3)
        elif t == 'grid':
            img = grid(frames, i)
        elif t == 'circle':
            img = circle(f, i, n)
        else:
            img = f
        # Punch-in on every beat cut: a 5% scale that settles over 4 frames.
        local = i % BEAT
        if t != 'circle' and local < 4:
            z = 1 + 0.05 * (1 - local / 4)
            cw, ch = round(W / z), round(H / z)
            im = Image.fromarray(img).crop(((W - cw) // 2, (H - ch) // 2, (W + cw) // 2, (H + ch) // 2)).resize((W, H), Image.BILINEAR)
        else:
            im = Image.fromarray(img)
        out.append(np.asarray(im))
    return out


def main():
    load_titles()
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / 'reel-collage-720.mp4'
    enc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)],
        stdin=subprocess.PIPE)
    shots, t = [], 0.0
    grain = RNG.integers(-4, 5, (4, H, W, 1), dtype=np.int16)
    frame_no = 0
    for c in EDIT:
        frames = render_card(c)
        for f in frames:
            noisy = np.clip(f.astype(np.int16) + grain[frame_no % 4], 0, 255).astype(np.uint8)
            enc.stdin.write(noisy.tobytes())
            frame_no += 1
        dur = len(frames) / FPS
        title, tools = TITLES[c['slug']]
        if shots and shots[-1]['slug'] == c['slug']:
            shots[-1]['end'] = round(t + dur, 3)
        else:
            shots.append({'start': round(t, 3), 'end': round(t + dur, 3), 'slug': c['slug'], 'title': title, 'tools': tools})
        t += dur
        print(f"{c['slug']:<40} {dur:4.2f}s")
    enc.stdin.close()
    enc.wait()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(target), '-vf', 'scale=854:480', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT / 'reel-collage-480.mp4')], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '2.6', '-i', str(target), '-frames:v', '1', '-q:v', '4', str(OUT / 'reel-collage-poster.jpg')], check=True)
    (OUT / 'reel-collage.json').write_text(json.dumps({'duration': round(t, 3), 'shots': shots}, indent=2) + '\n')
    print(f'reel-collage: {t:.2f}s, {target.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()

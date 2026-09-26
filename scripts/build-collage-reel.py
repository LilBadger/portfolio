#!/usr/bin/env python3
"""Collage / lyric-edit version of the hero reel.

Beat-cut edit (120 BPM, 12 frames per beat at 24 fps) of the recent work with per-cut photo
treatments (high-contrast black and white, split strips and grids of different images or regions
from the same project, circle crops,
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


def still(path, frames, drift=0.0, region=None):
    """A still with a slow push-in; `region` = (x, y, zoom) in source pixels frames one area of it."""
    src = Image.open(PUB / path).convert('RGB')
    zoom = region[2] if region else 1.0
    scale = max(W / src.width, H / src.height) * (1 + drift) * zoom
    base = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    fx = region[0] * scale if region else base.width / 2
    fy = region[1] * scale if region else base.height / 2
    out = []
    for i in range(frames):
        z = 1 + drift * (1 - i / max(1, frames - 1))
        cw, ch = min(round(W * z), base.width), min(round(H * z), base.height)
        l = int(min(max(fx - cw / 2, 0), base.width - cw))
        t = int(min(max(fy - ch / 2, 0), base.height - ch))
        out.append(np.asarray(base.crop((l, t, l + cw, t + ch)).resize((W, H), Image.BILINEAR)))
    return np.stack(out)


_CUTS = {}


def cuts_in(path):
    """Edit-cut times (seconds) in a source video, from frame differencing (cached)."""
    if path not in _CUTS:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(PUB / path), '-vf', f'fps={FPS},scale=160:90,format=gray', '-f', 'rawvideo', '-'],
                             check=True, capture_output=True).stdout
        f = np.frombuffer(raw, np.uint8).reshape(-1, 90, 160).astype(np.float32)
        diff = np.abs(np.diff(f, axis=0)).mean((1, 2))
        _CUTS[path] = [(i + 1) / FPS for i in np.where(diff > max(15, float(np.median(diff)) * 6))[0]]
    return _CUTS[path]


def load(spec, frames):
    """('clip', path, start[, focus]) | ('still', path) | ('crop', path, (x, y, zoom))."""
    if spec[0] == 'clip':
        start, end = spec[2], spec[2] + frames / FPS
        crossing = [t for t in cuts_in(spec[1]) if start < t < end]
        if crossing:
            # A cut inside a card flashes a second shot for a few frames: pick a clean start instead.
            raise SystemExit(f'{spec[1]} {start:.2f}-{end:.2f}s crosses an edit cut at {crossing[0]:.2f}s')
        return decode(spec[1], spec[2], frames, spec[3] if len(spec) > 3 else None)
    return still(spec[1], frames, region=spec[2] if spec[0] == 'crop' else None)


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


SLIDE = 8     # frames for a piece to slide into place


def _arrival(local, k, stagger):
    """0..1 slide progress of split piece k, `local` frames into the split segment."""
    if k == 0:
        return 1.0  # the first piece is already on screen when the split starts
    start = sum(stagger[:k])
    p = min(max((local - start) / SLIDE, 0.0), 1.0)
    return 1 - (1 - p) ** 3


def _slide_in(out, tile, x0, y0, progress, direction):
    """Paste `tile` at (x0, y0), offset horizontally by the unfinished part of its slide."""
    if progress <= 0:
        return
    h, w = tile.shape[:2]
    shift = int(round((1 - progress) * w * direction))
    src_l, src_r = max(0, -shift), min(w, w - shift)
    if src_r <= src_l:
        return
    out[y0:y0 + h, x0 + src_l + shift:x0 + src_r + shift] = tile[:, src_l:src_r]


def stack(pieces, i, rows, local, stagger):
    """Horizontal strips, each a different image or region of the same project, sliding in one by one."""
    band = H // rows
    out = np.zeros((H, W, 3), np.uint8)
    top = (H - band) // 2
    for r in range(rows):
        _slide_in(out, pieces[r][i][top:top + band], 0, r * band, _arrival(local, r, stagger), 1 if r % 2 else -1)
    for r in range(1, rows):
        out[r * band - 2:r * band + 2] = 0
    return out


def grid(pieces, i, local, stagger, n=2):
    """n x n tiles, each a different image or region of the same project, sliding in one by one."""
    out = np.zeros((H, W, 3), np.uint8)
    for k in range(n * n):
        r, c = divmod(k, n)
        tile = np.asarray(Image.fromarray(pieces[k][i]).resize((W // n, H // n), Image.BILINEAR))
        _slide_in(out, tile, c * (W // n), r * (H // n), _arrival(local, k, stagger), -1 if c == 0 else 1)
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

SPLIT_COUNT = {'stack2': 2, 'stack3': 3, 'grid': 4}


def card(slug, source, beats, segments, split=(), move='static', stagger=(7, 11, 8)):
    """`split`: the distinct sources (same project) shown in stack/grid strips or tiles, in order.
    `move`: 'static', 'push', 'pull' or 'snap' (a quicker push that settles). `stagger`: frames
    between split pieces arriving, deliberately uneven."""
    need = max((SPLIT_COUNT.get(t, 0) for _, t in segments), default=0)
    if need and len(split) < need:
        raise SystemExit(f'{slug}: a split treatment needs {need} different sources, got {len(split)}')
    if len({repr(spec) for spec in split}) != len(split):
        raise SystemExit(f'{slug}: split sources must all be different')
    if round(beats * BEAT) < MIN_FRAMES:
        raise SystemExit(f'{slug}: {beats} beats is shorter than the {MIN_FRAMES}-frame minimum (reads as a flash)')
    return dict(slug=slug, source=source, beats=beats, segments=segments, split=list(split), move=move, stagger=list(stagger))


MIN_FRAMES = 15  # 0.625 s: quick cuts, never a flash


FOREST_FOCUS = {'x': 0.35, 'y': 0.6, 'zoom': 1.5}
DAFT = 'assets/artstation/daft-punk-cover-art/01-vlx-maftei-finalupscaled.jpg'
CAT = 'assets/artstation/cat-walkman/01-vlx-maftei-catwalkmanhighrezblurred2.jpg'
# Uneven on purpose: quick 1.25-beat hits between long split holds, switches off the beat.
EDIT = [
    card('f1r-live-video', ('clip', F1R, 150.0), 3, [(3, 'circle')]),
    card('dark-forest', ('clip', FOREST, 10.0, FOREST_FOCUS), 1.25, [(1.25, 'bw')]),
    card('dark-forest', ('clip', FOREST, 10.7, FOREST_FOCUS), 2, [(2, 'color')], move='push'),
    card('dark-forest', ('clip', FOREST, 12.0, FOREST_FOCUS), 2.5, [(2.5, 'stack2')], stagger=(9,),
         split=[('clip', FOREST, 12.0, FOREST_FOCUS), ('clip', FOREST, 4.0, {'x': 0.78, 'y': 0.2, 'zoom': 1.6})]),  # boy / eyes in the trees
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 66.0), 1.25, [(1.25, 'bw')], move='snap'),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 61.2), 3.5, [(3.5, 'stack3')], stagger=(6, 13),
         split=[('clip', NOTLD, 61.2), ('clip', NOTLD, 45.0), ('clip', NOTLD, 91.0)]),  # couch room / TV / zombie presenter
    card('f1r-live-video', ('clip', F1R, 158.0), 1.5, [(1.5, 'bw')], move='snap'),
    card('f1r-live-video', ('clip', F1R, 166.0), 1.25, [(1.25, 'duotone')]),
    # Single-image projects split into different regions of the image.
    card('daft-punk-cover-art', ('still', DAFT), 1.25, [(1.25, 'color')], move='push'),
    card('daft-punk-cover-art', ('still', DAFT), 4, [(4, 'grid')], stagger=(5, 12, 7),
         split=[('crop', DAFT, (490, 330, 2.0)), ('crop', DAFT, (1400, 360, 2.0)), ('crop', DAFT, (1180, 650, 2.6)), ('crop', DAFT, (1140, 350, 3.0))]),
    card('cat-walkman', ('still', CAT), 2.5, [(2.5, 'stack2')], stagger=(11,),
         split=[('crop', CAT, (420, 470, 2.2)), ('crop', CAT, (1300, 560, 1.8))]),
    card('trips', ('still', 'assets/artstation/trips/07-vlx-maftei-landscapes-07.jpg'), 1.25, [(1.25, 'bw')]),
    card('trips', ('still', 'assets/artstation/trips/04-vlx-maftei-landscapes-04.jpg'), 3, [(3, 'color')], move='pull'),
    card('dark-forest', ('clip', INK, 12.0), 1.5, [(1.5, 'color')], move='snap'),
    card('dark-forest', ('clip', INK, 13.0), 3.5, [(3.5, 'stack3')], stagger=(10, 6),
         split=[('clip', INK, 4.0, {'x': 0.86, 'y': 0.2, 'zoom': 2.0}), ('clip', INK, 13.0, {'x': 0.18, 'y': 0.66, 'zoom': 2.2}),
                ('clip', INK, 18.0, {'x': 0.74, 'y': 0.72, 'zoom': 1.8})]),  # castle / boy / hollow log
    card('fugi-visualizer', ('still', f'{FUGI}/f1r-character-glitch.png'), 1.25, [(1.25, 'color')]),
    card('fugi-visualizer', ('still', f'{FUGI}/reference-tongue-in.png'), 1.25, [(1.25, 'bw')], move='snap'),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 100.0), 1.5, [(1.5, 'color')], move='push'),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 102.0), 4, [(4, 'grid')], stagger=(9, 5, 11),
         split=[('clip', NOTLD, 102.0), ('clip', NOTLD, 52.0), ('clip', NOTLD, 72.5), ('clip', NOTLD, 78.5)]),
    card('f1r-live-video', ('clip', F1R, 184.0), 2, [(2, 'circle')]),
    card('dark-forest', ('clip', FOREST, 21.0, FOREST_FOCUS), 2.5, [(2.5, 'stack2')], stagger=(8,),
         split=[('clip', FOREST, 21.0, FOREST_FOCUS), ('clip', FOREST, 26.0, {'x': 0.31, 'y': 0.25, 'zoom': 1.6})]),  # boy / eyes in the trees
]

TITLES = {}
TOOLS = {'dark-forest': ['Hunyuan3D', 'Kimodo', 'Blender'], 'f1r-live-video': ['LTX-2.3', 'Pi3X point cloud'], 'fugi-visualizer': ['Codex', 'WebGL'], 'trips': ['Flux', 'Runway']}


def load_titles():
    projects = json.loads((ROOT / 'content/manual-projects.json').read_text())
    overrides = json.loads((ROOT / 'content/project-overrides.json').read_text())
    for p in projects:
        merged = {**p, **overrides.get(p['slug'], {})}
        TITLES[p['slug']] = (merged['title'], TOOLS.get(p['slug'], merged.get('tools', [])[:2]))


def camera_move(img, u, move):
    """Zoom-only moves (no pans): slow push, slow pull, or a quicker 'snap' push that settles."""
    if move == 'static':
        return img
    if move == 'snap':
        e = 1 - (1 - min(u * 2.2, 1.0)) ** 3
        z = 1.0 + 0.1 * e
    else:
        e = u * u * (3 - 2 * u)
        z = 1.0 + 0.06 * (e if move == 'push' else 1 - e)
    cw, ch = W / z, H / z
    left, top = (W - cw) / 2, (H - ch) / 2
    return np.asarray(Image.fromarray(img).resize((W, H), Image.BICUBIC, box=(left, top, left + cw, top + ch)))


def render_card(c):
    n = round(c['beats'] * BEAT)
    frames = load(c['source'], n)
    # Split treatments (stack/grid) show the card's distinct same-project sources, never copies.
    pieces = [load(spec, n) for spec in c['split']]
    # Treatment per frame, switching on the beat; `starts` is each frame's segment start.
    treatments, starts = [], []
    for beats, t in c['segments']:
        count = round(beats * BEAT)
        starts += [len(treatments)] * count
        treatments += [t] * count
    treatments = (treatments + [treatments[-1]] * n)[:n]
    starts = (starts + [starts[-1]] * n)[:n]
    out = []
    for i in range(n):
        f = frames[i]
        t = treatments[i]
        local = i - starts[i]
        if t == 'bw':
            img = bw(f)
        elif t == 'duotone':
            img = duotone(f)
        elif t in ('stack2', 'stack3'):
            img = stack(pieces, i, SPLIT_COUNT[t], local, c['stagger'])
        elif t == 'grid':
            img = grid(pieces, i, local, c['stagger'])
        elif t == 'circle':
            img = circle(f, i, n)
        else:
            img = f
        if t != 'circle':
            img = camera_move(img, i / max(1, n - 1), c['move'])
        out.append(np.asarray(img))
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

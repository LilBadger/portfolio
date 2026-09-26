#!/usr/bin/env python3
"""Collage / lyric-edit version of the hero reel.

Beat-cut edit (120 BPM, 12 frames per beat at 24 fps) of the recent work with per-cut photo
treatments (high-contrast black and white, stacked duplicates, tiled grids, circle crops, a
UI "project card") and kinetic typography that pops in word by word in the site's own fonts.

Outputs (public/assets/generated/reel/):
  reel-collage-720.mp4, reel-collage-480.mp4, reel-collage-poster.jpg, reel-collage.json

Needs ffmpeg, Pillow and numpy.   python3 scripts/build-collage-reel.py
"""
import json
import math
import subprocess
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'
OUT = PUB / 'assets/generated/reel'
W, H, FPS = 1280, 720, 24
BEAT = 12  # frames per beat (120 BPM)
ACID = (166, 255, 0)
RNG = np.random.default_rng(7)

ARCHIVO = str(ROOT / 'node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2')
MONO = str(ROOT / 'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2')

NOTLD = 'assets/projects/night-of-the-living-dead-ltx-contest/night-of-the-living-dead-final.mp4'
F1R = 'assets/projects/f1r-live-video/f1r-live-final.mp4'
FOREST = 'assets/projects/dark-forest/dark-forest-final.mp4'
INK = 'assets/projects/dark-forest/look-dev-ink-edit.mp4'
FUGI = 'assets/projects/fugi-visualizer'


# ---------------------------------------------------------------- fonts / text

@lru_cache(maxsize=None)
def font(kind, size, weight=900, width=62):
    if kind == 'mono':
        f = ImageFont.truetype(MONO, size)
        f.set_variation_by_axes([weight])
        return f
    f = ImageFont.truetype(ARCHIVO, size)
    f.set_variation_by_axes([weight, width])
    return f


@lru_cache(maxsize=None)
def word_image(text, style, size):
    """RGBA image of one word in a given style (cached)."""
    pad = size // 4
    if style == 'mono':
        f = font('mono', size, 700)
        box = f.getbbox(text)
        img = Image.new('RGBA', (box[2] - box[0] + pad * 2, box[3] - box[1] + pad * 2))
        d = ImageDraw.Draw(img)
        d.text((pad - box[0], pad - box[1]), text, font=f, fill=ACID + (255,))
        return img
    f = font('display', size)
    box = f.getbbox(text)
    tw, th = box[2] - box[0], box[3] - box[1]
    depth = max(3, size // 18) if style == 'accent' else 0
    img = Image.new('RGBA', (tw + pad * 2 + depth, th + pad * 2 + depth))
    d = ImageDraw.Draw(img)
    x, y = pad - box[0], pad - box[1]
    if style == 'accent':
        # 3D extrude in deep green, black outline, acid face.
        for i in range(depth, 0, -1):
            d.text((x + i, y + i), text, font=f, fill=(18, 40, 0, 255), stroke_width=size // 22, stroke_fill=(0, 0, 0, 255))
        d.text((x, y), text, font=f, fill=ACID + (255,), stroke_width=size // 22, stroke_fill=(0, 0, 0, 255))
    else:
        shadow = Image.new('RGBA', img.size)
        ImageDraw.Draw(shadow).text((x + 3, y + 5), text, font=f, fill=(0, 0, 0, 170))
        img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(size / 30)))
        d.text((x, y), text, font=f, fill=(245, 246, 240, 255))
    return img


def layout_words(words, size, max_width, anchor='center'):
    """Place words into centred lines by their real glyph widths; returns [(img, x, y)] in reading order."""
    items = []
    for text, style in words:
        wsize = size if style != 'mono' else max(22, size // 4)
        f = font('mono', wsize, 700) if style == 'mono' else font('display', wsize)
        box = f.getbbox(text)
        items.append((word_image(text, style, wsize), box[2] - box[0], wsize // 4))
    gap = int(size * 0.26)
    lines, line, lw = [], [], 0
    for item in items:
        if line and lw + gap + item[1] > max_width:
            lines.append(line)
            line, lw = [], 0
        line.append(item)
        lw += (gap if line[:-1] else 0) + item[1]
    if line:
        lines.append(line)
    line_h = int(size * 0.9)
    total_h = line_h * len(lines)
    y0 = (H - total_h) // 2 if anchor == 'center' else int(H * 0.62) - total_h // 2
    placed = []
    for li, ln in enumerate(lines):
        x = (W - (sum(w for _, w, _ in ln) + gap * (len(ln) - 1))) // 2
        for img, w, pad in ln:
            placed.append((img, x - pad, y0 + li * line_h - pad))
            x += w + gap
    return placed


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


RING_TEXT = ' VLAD MAFTEI  /  VFX  /  3D  /  AI  /  2025—2026  /'


@lru_cache(maxsize=None)
def ring_glyph(ch):
    f = font('mono', 30, 700)
    img = Image.new('RGBA', (40, 44))
    ImageDraw.Draw(img).text((20, 22), ch, font=f, fill=(240, 242, 236, 255), anchor='mm')
    return img


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
    rot = i / total * 55
    ring_r = radius + 40
    n = len(RING_TEXT)
    for k, ch in enumerate(RING_TEXT):
        if ch == ' ':
            continue
        a = math.radians(k / n * 360 + rot - 90)
        glyph = ring_glyph(ch).rotate(-(k / n * 360 + rot), resample=Image.BICUBIC, expand=True)
        x, y = cx + ring_r * math.cos(a), cy + ring_r * math.sin(a)
        canvas.paste(glyph, (int(x - glyph.width / 2), int(y - glyph.height / 2)), glyph)
    return np.asarray(canvas)


def project_card(f, i, slug, title, tools, cover):
    """A UI card in the site's terminal style, like the streaming-app card in the reference."""
    bg = Image.fromarray(bw(f)).filter(ImageFilter.GaussianBlur(10))
    bg = Image.eval(bg, lambda v: int(v * 0.45))
    card_w, card_h = 820, 330
    slide = max(0, 4 - i) * 10
    x0, y0 = (W - card_w) // 2, (H - card_h) // 2 + slide
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle((x0, y0, x0 + card_w, y0 + card_h), radius=18, fill=(9, 11, 11), outline=(58, 64, 60), width=2)
    art = Image.open(PUB / cover).convert('RGB')
    s = min(art.width, art.height)
    art = art.crop(((art.width - s) // 2, (art.height - s) // 2, (art.width + s) // 2, (art.height + s) // 2)).resize((270, 270), Image.LANCZOS)
    bg.paste(art, (x0 + 30, y0 + 30))
    tx = x0 + 330
    d.text((tx, y0 + 38), '$ now_playing', font=font('mono', 22, 500), fill=(140, 148, 142))
    title_font = font('display', 50, 900, 100)
    lines, line = [], ''
    for word in title.upper().split():
        test = (line + ' ' + word).strip()
        if title_font.getlength(test) > card_w - 360 and line:
            lines.append(line)
            line = word
        else:
            line = test
    lines.append(line)
    for k, ln in enumerate(lines[:3]):
        d.text((tx, y0 + 78 + k * 52), ln, font=title_font, fill=(245, 246, 240))
    d.text((tx, y0 + 250), ' + '.join(tools).upper(), font=font('mono', 20, 700), fill=ACID)
    d.rounded_rectangle((tx, y0 + 282, tx + 250, y0 + 312), radius=15, outline=(90, 96, 90), width=2)
    d.text((tx + 125, y0 + 297), 'ABOUT THE PROJECT ->', font=font('mono', 15, 700), fill=(220, 222, 216), anchor='mm')
    return np.asarray(bg)


def name_card(f, i):
    base = Image.fromarray((bw(f) * 0.25).astype(np.uint8))
    d = ImageDraw.Draw(base)
    d.text((W // 2, H // 2 - 20), 'VLAD MAFTEI', font=font('display', 118, 900, 125), fill=(245, 246, 240), anchor='mm')
    typed = 'vladmaftei.com'[: max(0, i - 3)]
    d.text((W // 2, H // 2 + 70), f'$ {typed}_', font=font('mono', 30, 600), fill=ACID, anchor='mm')
    return np.asarray(base)


# ---------------------------------------------------------------- edit

def card(slug, source, beats, segments, words=(), size=150, anchor='center', **extra):
    return dict(slug=slug, source=source, beats=beats, segments=segments, words=list(words), size=size, anchor=anchor, **extra)


FOREST_FOCUS = {'x': 0.35, 'y': 0.6, 'zoom': 1.5}
EDIT = [
    card('f1r-live-video', ('clip', F1R, 150.0), 2, [(2, 'circle')]),
    card('dark-forest', ('clip', FOREST, 10.0, FOREST_FOCUS), 2, [(1, 'bw'), (1, 'color')], [('DARK', 'white'), ('FOREST', 'white')], 221),
    card('dark-forest', ('clip', FOREST, 12.0, FOREST_FOCUS), 1.5, [(1.5, 'stack2')], [('HUNYUAN3D', 'accent'), ('+', 'accent'), ('KIMODO', 'accent')], 156),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 30.4), 3, [(1, 'color'), (1, 'bw'), (1, 'stack3')],
         [('NIGHT', 'white'), ('OF', 'white'), ('THE', 'white'), ('LIVING', 'white'), ('DEAD', 'white')], 182),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 66.0), 2, [(2, 'card')],
         cover='assets/projects/night-of-the-living-dead-ltx-contest/final-frame-cover.jpg', tools=['ComfyUI', 'LTX-2']),
    card('f1r-live-video', ('clip', F1R, 158.0), 2, [(2, 'bw')], [('F1R', 'white'), ('FUGI', 'white'), ('LIVE', 'white')], 221),
    card('f1r-live-video', ('clip', F1R, 166.0), 1.5, [(1.5, 'duotone')], [('POINT', 'accent'), ('CLOUD', 'accent')], 195),
    card('daft-punk-cover-art', ('still', 'assets/artstation/daft-punk-cover-art/01-vlx-maftei-finalupscaled.jpg'), 2, [(1, 'color'), (1, 'grid')],
         [('DAFT', 'white'), ('PUNK', 'white'), ('COVER', 'accent'), ('ART', 'accent')], 169),
    card('cat-walkman', ('still', 'assets/artstation/cat-walkman/01-vlx-maftei-catwalkmanhighrezblurred2.jpg'), 2, [(2, 'stack2')],
         [('CAT', 'white'), ('WALKMAN', 'white')], 221),
    card('trips', ('still', 'assets/artstation/trips/07-vlx-maftei-landscapes-07.jpg'), 1, [(1, 'bw')], [('TRIPS', 'white')], 247),
    card('trips', ('still', 'assets/artstation/trips/04-vlx-maftei-landscapes-04.jpg'), 1.5, [(1.5, 'color')],
         [('AI', 'accent'), ('WORLDS', 'accent')], 195),
    card('dark-forest', ('clip', INK, 12.0), 2, [(1, 'color'), (1, 'stack3')], [('INK', 'white'), ('PASS', 'white')], 221),
    card('fugi-visualizer', ('still', f'{FUGI}/f1r-character-glitch.png'), 1, [(1, 'color')], [('F1R', 'accent')], 260),
    card('fugi-visualizer', ('still', f'{FUGI}/reference-tongue-in.png'), 1.5, [(1.5, 'bw')], [('FUGI', 'white'), ('VISUALIZER', 'white')], 182),
    card('night-of-the-living-dead-ltx-contest', ('clip', NOTLD, 100.0), 3, [(1, 'color'), (1, 'bw'), (1, 'grid')],
         [('3D', 'white'), ('/', 'white'), ('VFX', 'white'), ('/', 'white'), ('AI', 'accent')], 247),
    card('f1r-live-video', ('clip', F1R, 184.0), 2, [(2, 'circle')]),
    card('dark-forest', ('clip', FOREST, 20.0), 2, [(2, 'name')]),
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
    placed = layout_words(c['words'], c['size'], W * 0.9, c['anchor']) if c['words'] else []
    step = max(2, min(5, (n - 4) // max(1, len(placed))))
    title, tools = TITLES[c['slug']]
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
        elif t == 'card':
            img = project_card(f, i, c['slug'], title, tools, c['cover'])
        elif t == 'name':
            img = name_card(f, i)
        else:
            img = f
        # Punch-in on every beat cut: a 5% scale that settles over 4 frames.
        local = i % BEAT
        if t not in ('circle', 'card', 'name') and local < 4:
            z = 1 + 0.05 * (1 - local / 4)
            cw, ch = round(W / z), round(H / z)
            im = Image.fromarray(img).crop(((W - cw) // 2, (H - ch) // 2, (W + cw) // 2, (H + ch) // 2)).resize((W, H), Image.BILINEAR)
        else:
            im = Image.fromarray(img)
        im = im.convert('RGBA')
        for k, (word, x, y) in enumerate(placed):
            appear = 1 + k * step
            if i < appear:
                continue
            age = i - appear
            if age < 3:  # pop: 125% -> 100%
                s = 1 + 0.25 * (1 - age / 3)
                wimg = word.resize((round(word.width * s), round(word.height * s)), Image.BILINEAR)
                im.alpha_composite(wimg, (round(x - (wimg.width - word.width) / 2), round(y - (wimg.height - word.height) / 2)))
            else:
                im.alpha_composite(word, (x, y))
        out.append(np.asarray(im.convert('RGB')))
    return out


def main():
    load_titles()
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / 'reel-collage-720.mp4'
    enc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)],
        stdin=subprocess.PIPE)
    shots, t = [], 0.0
    grain = RNG.integers(-9, 10, (4, H, W, 1), dtype=np.int16)
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

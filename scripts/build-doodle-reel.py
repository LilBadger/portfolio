#!/usr/bin/env python3
"""Hand-drawn doodle montage (?reel=doodle), after the adidas 'There Will Be Haters' spot.

Longer shots of the recent work with boiling, marker-style doodles and emoticons that track each
subject (via the SAM3 mattes in .collage-cache/), a wobbling hand-drawn outline around the
subject, and short psychedelic kaleidoscope bursts (~0.3 s) on some cuts.

Inputs: .collage-cache/src/<name>.mp4 and .collage-cache/matte/<name>/ (see README).
Outputs: public/assets/generated/reel/reel-doodle-{720,480}.mp4, -poster.jpg, .json
"""
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'
CACHE = ROOT / '.collage-cache'
OUT = PUB / 'assets/generated/reel'
W, H, FPS = 1280, 720, 24
SS = 2  # doodles are drawn at 2x and downsampled for smooth marker edges

ACID = (166, 255, 0)
PINK = (255, 40, 160)
WHITE = (246, 246, 240)
RED = (255, 52, 60)
ART = 'assets/artstation'
FUGI = 'assets/projects/fugi-visualizer'
RNG = np.random.default_rng(11)


# ---------------------------------------------------------------- sources

def cover(img):
    s = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    l, t = (img.width - W) // 2, (img.height - H) // 2
    return img.crop((l, t, l + W, t + H))


def load_clip(name, start, frames, zoom=1.0):
    """Frames + mattes of a cached clip. `zoom` > 1 crops in on the subject (fixed crop centred on its
    average position), so small subjects fill the frame and the doodles have room."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(CACHE / 'src' / f'{name}.mp4'), '-frames:v', str(frames),
                          '-vf', f'scale={W}:{H},format=rgb24', '-f', 'rawvideo', '-'], check=True, capture_output=True).stdout
    arr = list(np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3))
    first = round(start * FPS)
    files = sorted((CACHE / 'matte' / name).glob('*.png'))[first:first + len(arr)]
    mattes = [np.asarray(Image.open(f).convert('L').resize((W, H))) for f in files]
    if zoom > 1:
        centres = []
        for m in mattes:
            ys, xs = np.where(m[::4, ::4] > 100)
            if len(xs):
                centres.append((xs.mean() * 4, ys.mean() * 4))
        cx, cy = np.mean(centres, 0) if centres else (W / 2, H / 2)
        cw, ch = W / zoom, H / zoom
        left, top = min(max(cx - cw / 2, 0), W - cw), min(max(cy - ch * 0.55, 0), H - ch)
        box = (left, top, left + cw, top + ch)
        arr = [np.asarray(Image.fromarray(a).resize((W, H), Image.BICUBIC, box=box)) for a in arr]
        mattes = [np.asarray(Image.fromarray(m).resize((W, H), Image.BILINEAR, box=box)) for m in mattes]
    return arr, mattes


def load_still(path, name, frames, push=0.06):
    """A still with a slow push-in; the matte is pushed identically."""
    img, matte = cover(Image.open(PUB / path).convert('RGB')), cover(Image.open(CACHE / 'matte' / name / '0000.png').convert('L'))
    out_f, out_m = [], []
    for i in range(frames):
        z = 1 + push * i / max(1, frames - 1)
        cw, ch = W / z, H / z
        box = ((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2)
        out_f.append(np.asarray(img.resize((W, H), Image.BICUBIC, box=box)))
        out_m.append(np.asarray(matte.resize((W, H), Image.BILINEAR, box=box)))
    return out_f, out_m


def smooth_boxes(mattes, window=5):
    """Per-frame subject bbox (x0, y0, x1, y1), smoothed so doodles don't jitter with the matte."""
    boxes = []
    for m in mattes:
        ys, xs = np.where(m[::4, ::4] > 100)
        boxes.append(np.array([xs.min() * 4, ys.min() * 4, xs.max() * 4, ys.max() * 4], float) if len(xs) else None)
    known = [b for b in boxes if b is not None]
    fallback = np.mean(known, 0) if known else np.array([W * 0.3, H * 0.2, W * 0.7, H * 0.9])
    boxes = np.array([b if b is not None else fallback for b in boxes])
    out = np.empty_like(boxes)
    for i in range(len(boxes)):
        out[i] = boxes[max(0, i - window):i + window + 1].mean(0)
    return out


# ---------------------------------------------------------------- doodle shapes (unit coords, y down)

def circle_pts(n=28, rx=1.0, ry=1.0, cx=0.0, cy=0.0, start=0.0, sweep=2 * math.pi):
    t = np.linspace(start, start + sweep, n)
    return np.stack([cx + rx * np.cos(t), cy + ry * np.sin(t)], 1)


def shape(kind):
    """List of (points, closed, filled) in roughly [-1, 1]."""
    if kind == 'sparkle':
        return [(np.array([[0, -1], [0, 1]]), False, False), (np.array([[-1, 0], [1, 0]]), False, False),
                (np.array([[-0.62, -0.62], [0.62, 0.62]]), False, False), (np.array([[-0.62, 0.62], [0.62, -0.62]]), False, False)]
    if kind == 'star':
        pts = [(math.sin(a) * (1 if k % 2 == 0 else 0.45), -math.cos(a) * (1 if k % 2 == 0 else 0.45))
               for k, a in enumerate(np.linspace(0, 2 * math.pi, 11)[:-1])]
        return [(np.array(pts), True, True)]
    if kind == 'heart':
        t = np.linspace(0, 2 * math.pi, 40)
        x = 16 * np.sin(t) ** 3
        y = -(13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t))
        return [(np.stack([x, y], 1) / 17, True, True)]
    if kind == 'spiral':
        t = np.linspace(0, 5.5 * math.pi, 70)
        r = t / (5.5 * math.pi)
        return [(np.stack([r * np.cos(t), r * np.sin(t)], 1), False, False)]
    if kind == 'bolt':
        return [(np.array([[0.25, -1], [-0.35, 0.05], [0.15, 0.05], [-0.25, 1], [0.45, -0.2], [-0.05, -0.2], [0.35, -1]]), True, True)]
    if kind == 'note':
        return [(circle_pts(16, 0.32, 0.24, -0.25, 0.7), True, True), (np.array([[0.07, 0.7], [0.07, -0.9], [0.55, -0.55]]), False, False)]
    if kind == 'notes':
        return [(circle_pts(14, 0.24, 0.18, -0.6, 0.72), True, True), (circle_pts(14, 0.24, 0.18, 0.45, 0.55), True, True),
                (np.array([[-0.36, 0.72], [-0.36, -0.75], [0.69, -0.95], [0.69, 0.55]]), False, False)]
    if kind == 'drops':
        drop = lambda cx, cy, s: circle_pts(18, 0.3 * s, 0.34 * s, cx, cy + 0.1 * s, math.radians(-30), math.radians(240)).tolist() + [[cx, cy - 0.55 * s]]
        return [(np.array(drop(-0.45, 0.0, 1.0)), True, True), (np.array(drop(0.35, -0.35, 0.75)), True, True)]
    if kind == 'motion':
        return [(np.array([[-1, y], [0.6 - abs(y) * 0.4, y]]), False, False) for y in (-0.55, 0.0, 0.55)]
    if kind == 'bang':
        return [(np.array([[-0.3, -1], [-0.22, 0.35]]), False, False), (circle_pts(10, 0.09, 0.09, -0.2, 0.75), True, True),
                (np.array([[0.3, -1], [0.22, 0.35]]), False, False), (circle_pts(10, 0.09, 0.09, 0.2, 0.75), True, True)]
    if kind == 'smiley':
        return [(circle_pts(30), True, False), (circle_pts(8, 0.1, 0.13, -0.35, -0.25), True, True),
                (circle_pts(8, 0.1, 0.13, 0.35, -0.25), True, True), (circle_pts(16, 0.55, 0.45, 0, 0.05, math.radians(20), math.radians(140)), False, False)]
    if kind == 'skull':
        head = circle_pts(26, 0.85, 0.75, 0, -0.2, math.radians(140), math.radians(260))
        jaw = np.array([[0.55, 0.45], [0.5, 0.9], [-0.5, 0.9], [-0.55, 0.45]])
        return [(np.vstack([head, jaw]), True, False), (circle_pts(12, 0.22, 0.25, -0.33, -0.15), True, True),
                (circle_pts(12, 0.22, 0.25, 0.33, -0.15), True, True)] + [(np.array([[x, 0.62], [x, 0.9]]), False, False) for x in (-0.25, 0, 0.25)]
    if kind == 'heart_eyes':
        eye = lambda cx: shape('heart')[0][0] * 0.28 + [cx, -0.22]
        return [(circle_pts(30), True, False), (eye(-0.36), True, True), (eye(0.36), True, True),
                (circle_pts(16, 0.5, 0.4, 0, 0.12, math.radians(15), math.radians(150)), False, False)]
    if kind == 'crown':
        return [(np.array([[-1, 0.6], [-1, -0.5], [-0.5, 0.05], [0, -0.8], [0.5, 0.05], [1, -0.5], [1, 0.6]]), True, False)]
    if kind == 'halo':
        return [(circle_pts(34, 1.0, 0.28), True, False)]
    if kind == 'eyes':
        return [(circle_pts(18, 0.42, 0.26, -0.5, 0), True, False), (circle_pts(10, 0.12, 0.12, -0.45, 0.02), True, True),
                (circle_pts(18, 0.42, 0.26, 0.5, 0), True, False), (circle_pts(10, 0.12, 0.12, 0.55, 0.02), True, True)]
    if kind == 'rays':
        return [(np.array([[math.cos(a) * 0.55, math.sin(a) * 0.55], [math.cos(a), math.sin(a)]]), False, False)
                for a in np.linspace(0, 2 * math.pi, 11)[:-1]]
    if kind == 'arrow':
        return [(np.array([[0, 1], [0, -1]]), False, False), (np.array([[-0.45, -0.5], [0, -1], [0.45, -0.5]]), False, False)]
    if kind == 'zzz':
        z = lambda cx, cy, s: np.array([[cx - s, cy - s], [cx + s, cy - s], [cx - s, cy + s], [cx + s, cy + s]])
        return [(z(-0.5, 0.5, 0.3), False, False), (z(0.05, -0.05, 0.24), False, False), (z(0.5, -0.55, 0.18), False, False)]
    if kind == 'squiggle':
        t = np.linspace(-1, 1, 40)
        return [(np.stack([t, 0.35 * np.sin(t * 9)], 1), False, False)]
    if kind == 'fire':
        return [(np.array([[0, -1], [0.45, -0.3], [0.3, -0.45], [0.7, 0.2], [0.55, 0.85], [0, 1], [-0.55, 0.85], [-0.7, 0.2],
                           [-0.3, -0.2], [-0.2, 0.1], [-0.05, -0.4]]), True, True)]
    raise KeyError(kind)


def resample(pts, closed, step=0.08):
    if closed:
        pts = np.vstack([pts, pts[:1]])
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    length = np.concatenate([[0], np.cumsum(seg)])
    if length[-1] == 0:
        return pts
    t = np.linspace(0, length[-1], max(2, int(length[-1] / step) + 1))
    return np.stack([np.interp(t, length, pts[:, 0]), np.interp(t, length, pts[:, 1])], 1)


def wobble(pts, seed, amount):
    """Hand-drawn wobble: smooth low-frequency noise along the line, re-rolled every boil step."""
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, amount, pts.shape)
    taps = min(5, len(pts))
    kernel = np.ones(taps) / taps
    noise = np.stack([np.convolve(noise[:, k], kernel, mode='same')[:len(pts)] for k in range(2)], 1) * 2.2
    return pts + noise


def back_out(t, overshoot=2.2):
    t = min(max(t, 0.0), 1.0) - 1
    return 1 + t * t * ((overshoot + 1) * t + overshoot)


class Doodle:
    def __init__(self, kind, u, v, size, colour, appear=0, anchor='bbox', rot=0.0, spin=0.0, drift=(0.0, 0.0), width=1.0):
        self.kind, self.u, self.v, self.size, self.colour = kind, u, v, size, colour
        self.appear, self.anchor, self.rot, self.spin, self.drift, self.width = appear, anchor, rot, spin, np.array(drift), width
        self.parts = [(resample(np.asarray(p, float), c), c, f) for p, c, f in shape(kind)]
        self.seed = int(RNG.integers(1 << 30))

    def draw(self, draw, i, box):
        age = i - self.appear
        if age < 0:
            return
        pop = back_out(age / 4)
        if self.anchor == 'bbox':
            x0, y0, x1, y1 = box
            cx, cy, scale = x0 + self.u * (x1 - x0), y0 + self.v * (y1 - y0), self.size * (y1 - y0)
        else:
            cx, cy, scale = self.u * W, self.v * H, self.size * H
        cx, cy = cx + self.drift[0] * age, cy + self.drift[1] * age
        boil = age // 2  # redrawn on twos, like hand animation
        wiggle = 4 * math.sin(boil * 1.7 + self.seed % 7)
        a = math.radians(self.rot + self.spin * age + wiggle)
        rot = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
        line = max(2.0, scale * 0.07) * self.width * SS
        for k, (pts, closed, filled) in enumerate(self.parts):
            p = wobble(pts, self.seed + boil * 101 + k, 0.018) @ rot.T * scale * pop
            p = [(float((cx + x) * SS), float((cy + y) * SS)) for x, y in p]
            if filled and len(p) > 2:
                draw.polygon(p, fill=self.colour + (255,))
            draw.line(p, fill=self.colour + (255,), width=int(line), joint='curve')
            # Second, thinner pass slightly off the first: the double-stroke marker look.
            p2 = wobble(pts, self.seed + boil * 101 + k + 50, 0.022) @ rot.T * scale * pop
            p2 = [(float((cx + x) * SS), float((cy + y) * SS)) for x, y in p2]
            draw.line(p2, fill=self.colour + (200,), width=max(1, int(line * 0.45)), joint='curve')
            for x, y in (p[0], p[-1]):
                r = line / 2
                draw.ellipse((x - r, y - r, x + r, y + r), fill=self.colour + (255,))


def outline(matte, i, colour, width=5):
    """Boiling hand-drawn outline hugging the subject: a ring around the matte, displaced by noise on twos."""
    small = Image.fromarray(matte).resize((W // 2, H // 2), Image.BILINEAR).point(lambda v: 255 if v > 110 else 0)
    outer = small.filter(ImageFilter.MaxFilter(2 * width + 3))
    inner = small.filter(ImageFilter.MaxFilter(3))
    ring = np.asarray(outer, np.float32) - np.asarray(inner, np.float32)
    rng = np.random.default_rng(900 + i // 2)
    grid = rng.normal(0, 2.4, (2, 6, 10)).astype(np.float32)
    dx = np.asarray(Image.fromarray(grid[0]).resize((W // 2, H // 2), Image.BICUBIC))
    dy = np.asarray(Image.fromarray(grid[1]).resize((W // 2, H // 2), Image.BICUBIC))
    yy, xx = np.mgrid[0:H // 2, 0:W // 2]
    sx = np.clip(xx + dx, 0, W // 2 - 1).astype(np.int32)
    sy = np.clip(yy + dy, 0, H // 2 - 1).astype(np.int32)
    ring = ring[sy, sx]
    alpha = Image.fromarray(np.clip(ring, 0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    layer = Image.new('RGBA', (W, H), colour + (0,))
    layer.putalpha(alpha)
    return layer


# ---------------------------------------------------------------- psychedelic burst

GY, GX = np.mgrid[0:H, 0:W].astype(np.float32)


def sample(img, x, y):
    x = np.clip(x, 0, W - 1.001)
    y = np.clip(y, 0, H - 1.001)
    x0, y0 = x.astype(np.int32), y.astype(np.int32)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    top = img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx
    bottom = img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx
    return top * (1 - fy) + bottom * fy


def hue_rotate(img, degrees, saturation=1.0):
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    y = 0.299 * r + 0.587 * g + 0.114 * b
    i = 0.596 * r - 0.274 * g - 0.322 * b
    q = 0.211 * r - 0.523 * g + 0.312 * b
    a = math.radians(degrees)
    i, q = (i * math.cos(a) - q * math.sin(a)) * saturation, (i * math.sin(a) + q * math.cos(a)) * saturation
    return np.stack([y + 0.956 * i + 0.621 * q, y - 0.272 * i - 0.647 * q, y - 1.106 * i + 1.703 * q], -1)


def kaleidoscope(frame, strength, phase):
    """Mirror the frame into a rotating 6-fold kaleidoscope, pushed toward hot pink/violet."""
    if strength <= 0:
        return frame
    img = frame.astype(np.float32)
    cx, cy = W / 2, H / 2
    dx, dy = GX - cx, GY - cy
    r = np.hypot(dx, dy) * (0.8 - 0.15 * strength)
    seg = 2 * math.pi / 6
    theta = np.mod(np.arctan2(dy, dx) + phase, seg)
    theta = np.where(theta > seg / 2, seg - theta, theta) - phase * 0.5
    k = sample(img, cx + r * np.cos(theta), cy + r * np.sin(theta))
    k = hue_rotate(k, 70 + phase * 60, 1.8)
    k = np.clip(k * 1.15 + np.array([40, 0, 35]) * strength, 0, 255)
    return (img * (1 - strength) + k * strength).astype(np.uint8)


BURST_OUT = [0.35, 0.7, 1.0]
BURST_IN = [1.0, 0.8, 0.45, 0.15]


# ---------------------------------------------------------------- the edit

def still(path, name):
    return ('still', path, name)


def clip(name, start=0.0, zoom=1.0):
    return ('clip', name, start, zoom)


# (slug, source, seconds, burst into this shot, outline colour or None, doodles)
EDIT = [
    ('f1r-live-video', clip('f1r_singer', 0.2), 2.5, False, PINK, [
        Doodle('notes', 0.95, 0.12, 0.2, WHITE, 3, rot=12), Doodle('heart', 0.08, 0.2, 0.13, PINK, 8, rot=-15),
        Doodle('sparkle', 0.85, 0.55, 0.1, ACID, 13), Doodle('heart', 1.05, 0.45, 0.09, PINK, 18, rot=20),
        Doodle('note', 0.05, 0.62, 0.14, WHITE, 24, rot=-10)]),
    ('dark-forest', clip('forest_boy_a', 0.5, 2.6), 3.0, True, WHITE, [
        Doodle('rays', -0.02, 0.42, 0.3, ACID, 2, spin=1.5), Doodle('eyes', -0.9, -0.05, 0.09, WHITE, 8),
        Doodle('eyes', 1.8, 0.0, 0.08, WHITE, 16), Doodle('sparkle', 0.2, -0.25, 0.22, ACID, 22),
        Doodle('bang', 1.35, 0.15, 0.17, PINK, 30), Doodle('eyes', 1.2, -0.2, 0.07, WHITE, 40)]),
    ('night-of-the-living-dead-ltx-contest', clip('notld_carry', 0.3), 2.25, False, ACID, [
        Doodle('drops', 0.25, 0.08, 0.12, WHITE, 2), Doodle('motion', -0.08, 0.45, 0.14, WHITE, 6),
        Doodle('bang', 0.62, 0.1, 0.12, ACID, 12), Doodle('squiggle', 0.5, 0.95, 0.07, ACID, 18)]),
    ('night-of-the-living-dead-ltx-contest', clip('notld_armchair', 0.5), 2.5, True, None, [
        Doodle('skull', 0.2, -0.12, 0.2, WHITE, 3, rot=-10), Doodle('spiral', 0.32, 0.28, 0.1, ACID, 8, spin=-6),
        Doodle('crown', 0.25, -0.02, 0.1, ACID, 14, rot=-8), Doodle('drops', 0.05, 0.55, 0.1, RED, 20),
        Doodle('zzz', 0.55, 0.05, 0.12, WHITE, 28)]),
    ('night-of-the-living-dead-ltx-contest', clip('notld_tv', 0.2), 2.0, False, WHITE, [
        Doodle('bolt', 0.02, 0.1, 0.16, ACID, 2, rot=-12), Doodle('bolt', 0.98, 0.15, 0.14, ACID, 6, rot=15),
        Doodle('sparkle', 0.85, 0.85, 0.1, WHITE, 12), Doodle('squiggle', 0.5, -0.06, 0.1, PINK, 18)]),
    ('night-of-the-living-dead-ltx-contest', clip('notld_presenter', 0.4), 2.0, True, PINK, [
        Doodle('halo', 0.5, -0.06, 0.12, ACID, 3), Doodle('bolt', 0.1, 0.25, 0.14, PINK, 8, rot=-20),
        Doodle('skull', 0.95, 0.2, 0.14, WHITE, 14, rot=12), Doodle('fire', 0.08, 0.8, 0.14, RED, 20)]),
    ('daft-punk-cover-art', still(f'{ART}/daft-punk-cover-art/01-vlx-maftei-finalupscaled.jpg', 'daft'), 2.75, False, None, [
        Doodle('halo', 0.24, 0.12, 0.09, ACID, 2, anchor='frame'), Doodle('halo', 0.74, 0.1, 0.09, ACID, 6, anchor='frame'),
        Doodle('star', 0.12, 0.3, 0.06, WHITE, 10, anchor='frame', spin=4), Doodle('motion', 0.9, 0.62, 0.08, WHITE, 14, anchor='frame'),
        Doodle('star', 0.52, 0.26, 0.05, PINK, 20, anchor='frame', spin=-5), Doodle('sparkle', 0.86, 0.3, 0.06, ACID, 26, anchor='frame')]),
    ('cat-walkman', still(f'{ART}/cat-walkman/01-vlx-maftei-catwalkmanhighrezblurred2.jpg', 'cat'), 2.25, True, WHITE, [
        Doodle('heart_eyes', 1.25, 0.15, 0.26, PINK, 3, rot=8), Doodle('notes', 0.66, 0.35, 0.09, WHITE, 8, anchor='frame', rot=-8),
        Doodle('note', 0.8, 0.2, 0.07, ACID, 14, anchor='frame', rot=10), Doodle('heart', 1.15, 0.85, 0.16, PINK, 20)]),
    ('trips', still(f'{ART}/trips/07-vlx-maftei-landscapes-07.jpg', 'trips_rock'), 2.0, False, ACID, [
        Doodle('arrow', 0.5, 1.25, 0.25, WHITE, 3), Doodle('sparkle', 0.15, 0.9, 0.2, ACID, 8), Doodle('spiral', 0.85, 0.35, 0.18, WHITE, 14, spin=5)]),
    ('fugi-visualizer', still(f'{FUGI}/reference-tongue-in.png', 'fugi'), 2.25, True, None, [
        Doodle('crown', 0.5, -0.02, 0.14, ACID, 2), Doodle('heart', 0.08, 0.35, 0.1, PINK, 7, rot=-12), Doodle('heart', 0.93, 0.3, 0.12, PINK, 11, rot=14),
        Doodle('sparkle', 0.12, 0.7, 0.1, WHITE, 16), Doodle('smiley', 0.92, 0.75, 0.13, ACID, 22, rot=-10)]),
    ('dark-forest', clip('forest_boy_b', 0.3, 2.4), 3.0, True, ACID, [
        Doodle('rays', 0.85, 0.42, 0.34, ACID, 2, spin=-1.5), Doodle('eyes', -0.8, -0.4, 0.09, WHITE, 10),
        Doodle('eyes', 1.9, -0.3, 0.08, WHITE, 18), Doodle('heart', -0.55, 0.15, 0.22, PINK, 26),
        Doodle('star', 1.6, 0.2, 0.22, ACID, 34, spin=6)]),
]


def render_shot(spec, doodles, colour, frames_n):
    kind = spec[0]
    frames, mattes = load_clip(spec[1], spec[2], frames_n, spec[3]) if kind == 'clip' else load_still(spec[1], spec[2], frames_n)
    frames_n = min(frames_n, len(frames), len(mattes))
    boxes = smooth_boxes(mattes[:frames_n])
    out = []
    for i in range(frames_n):
        base = Image.fromarray(frames[i]).convert('RGBA')
        if colour is not None and i >= 1:
            base.alpha_composite(outline(mattes[i], i, colour))
        layer = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        for d in doodles:
            d.draw(draw, i, boxes[i])
        base.alpha_composite(layer.resize((W, H), Image.LANCZOS))
        out.append(np.asarray(base.convert('RGB')))
    return out


def main():
    projects = json.loads((ROOT / 'content/manual-projects.json').read_text())
    overrides = json.loads((ROOT / 'content/project-overrides.json').read_text())
    titles = {p['slug']: {**p, **overrides.get(p['slug'], {})}['title'] for p in projects}
    tools = {'dark-forest': ['Hunyuan3D', 'Kimodo', 'Blender'], 'f1r-live-video': ['LTX-2.3', 'Pi3X point cloud'],
             'night-of-the-living-dead-ltx-contest': ['ComfyUI', 'LTX-2'], 'fugi-visualizer': ['Codex', 'WebGL'],
             'trips': ['Flux', 'Runway'], 'daft-punk-cover-art': ['ComfyUI', 'SDXL'], 'cat-walkman': ['SDXL', 'Suno']}
    shots = [render_shot(spec, doodles, colour, round(seconds * FPS)) for _, spec, seconds, _, colour, doodles in EDIT]
    # Psychedelic bursts on selected cuts: the last frames of the outgoing shot and the first of the incoming.
    phase = 0.0
    for index, (_, _, _, burst, _, _) in enumerate(EDIT):
        if not burst or index == 0:
            continue
        prev, cur = shots[index - 1], shots[index]
        for k, s in enumerate(BURST_OUT):
            j = len(prev) - len(BURST_OUT) + k
            prev[j] = kaleidoscope(prev[j], s, phase + k * 0.25)
        for k, s in enumerate(BURST_IN):
            cur[k] = kaleidoscope(cur[k], s, phase + (len(BURST_OUT) + k) * 0.25)
        phase += 1.3

    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / 'reel-doodle-720.mp4'
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)],
                           stdin=subprocess.PIPE)
    manifest, t = [], 0.0
    for (slug, *_), frames in zip(EDIT, shots):
        for f in frames:
            enc.stdin.write(f.tobytes())
        dur = len(frames) / FPS
        if manifest and manifest[-1]['slug'] == slug:
            manifest[-1]['end'] = round(t + dur, 3)
        else:
            manifest.append({'start': round(t, 3), 'end': round(t + dur, 3), 'slug': slug, 'title': titles[slug], 'tools': tools.get(slug, [])})
        t += dur
        print(f'{slug:<40} {dur:4.2f}s', flush=True)
    enc.stdin.close()
    enc.wait()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(target), '-vf', 'scale=854:480', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT / 'reel-doodle-480.mp4')], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '1.5', '-i', str(target), '-frames:v', '1', '-q:v', '4', str(OUT / 'reel-doodle-poster.jpg')], check=True)
    (OUT / 'reel-doodle.json').write_text(json.dumps({'duration': round(t, 3), 'shots': manifest}, indent=2) + '\n')
    print(f'reel-doodle: {t:.2f}s, {target.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()

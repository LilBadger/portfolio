#!/usr/bin/env python3
"""Dense forward optical flow for cached clips, so doodles can be painted *onto* the scene.

Needs OpenCV (e.g. ComfyUI's venv):  /path/to/python scripts/track-flow.py forest_boy_a notld_armchair ...
Writes .collage-cache/flow/<name>.npy: float16 (frames-1, H/2, W/2, 2), flow t -> t+1 in full-res pixels.
"""
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.collage-cache'
W, H = 1280, 720


def frames(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(CACHE / 'src' / f'{name}.mp4'), '-vf', f'scale={W}:{H},format=gray', '-f', 'rawvideo', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W)


def main():
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    (CACHE / 'flow').mkdir(parents=True, exist_ok=True)
    for name in sys.argv[1:]:
        gray = frames(name)
        flows = []
        for a, b in zip(gray[:-1], gray[1:]):
            flow = dis.calc(a, b, None)  # full-res pixels
            flows.append(cv2.resize(flow, (W // 2, H // 2), interpolation=cv2.INTER_AREA))
        out = np.stack(flows).astype(np.float16)
        np.save(CACHE / 'flow' / f'{name}.npy', out)
        mag = np.linalg.norm(out.astype(np.float32), axis=-1)
        print(f'{name}: {len(out)} flow fields, median motion {np.median(mag):.2f}px, 95th {np.percentile(mag, 95):.2f}px')


if __name__ == '__main__':
    main()

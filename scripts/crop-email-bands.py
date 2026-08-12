#!/usr/bin/env python3
"""Landscape 1400×780 bands for welcome email voucher and restaurant strips."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'email'
W, H = 1400, 780

# bias_y: 0 = top … 1 = bottom (cover crop on portrait sources)
PRESETS = {
    'voucher-24.jpg': {
        'src': 'public/restaurant/11-tavolo-canale.jpg',
        'bias_y': 0.60,
    },
}


def cover_crop(src: Path, out: Path, *, bias_y: float) -> None:
    im = Image.open(src).convert('RGB')
    w, h = im.size
    target = W / H
    if w / h > target:
        nw = int(h * target)
        left = (w - nw) // 2
        im = im.crop((left, 0, left + nw, h))
    else:
        nh = int(w / target)
        top = max(0, min(h - nh, int((h - nh) * bias_y)))
        im = im.crop((0, top, w, top + nh))
    im = im.resize((W, H), Image.Resampling.LANCZOS)
    im.save(out, 'JPEG', quality=92, optimize=True, progressive=True, subsampling=0)


def main() -> None:
    for name, cfg in PRESETS.items():
        src = ROOT / cfg['src']
        out = OUT / name
        cover_crop(src, out, bias_y=cfg['bias_y'])
        kb = out.stat().st_size / 1024
        print(f'{name} <- {cfg["src"]} bias_y={cfg["bias_y"]} ({kb:.0f} KB)')


if __name__ == '__main__':
    main()

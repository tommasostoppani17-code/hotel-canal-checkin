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
    'booking-hero-v3.jpg': {
        'src': 'public/restaurant/03-sala-interna.jpg',
        'bias_y': 0.40,
        'strip_black': True,
    },
}


def strip_black_bar(im: Image.Image) -> Image.Image:
    """Remove solid black letterbox rows at the bottom of some catalog exports."""
    px = im.load()
    w, h = im.size
    black = 0
    for y in range(h - 1, -1, -1):
        row_mean = sum(sum(px[x, y][:3]) for x in range(0, w, max(1, w // 40))) / (
            max(1, (w + max(1, w // 40) - 1) // max(1, w // 40)) * 3
        )
        if row_mean < 20:
            black += 1
        else:
            break
    if black:
        return im.crop((0, 0, w, h - black))
    return im


def cover_crop(src: Path, out: Path, *, bias_y: float, strip_black: bool = False) -> None:
    im = Image.open(src).convert('RGB')
    if strip_black:
        im = strip_black_bar(im)
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
        cover_crop(
            src,
            out,
            bias_y=cfg['bias_y'],
            strip_black=bool(cfg.get('strip_black')),
        )
        kb = out.stat().st_size / 1024
        print(f'{name} <- {cfg["src"]} bias_y={cfg["bias_y"]} ({kb:.0f} KB)')


if __name__ == '__main__':
    main()

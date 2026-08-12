#!/usr/bin/env python3
"""Square 960×960 crops for the welcome-email 2×2 taste grid."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'email'
SIZE = 960

# zoom: fraction of min(w,h); x/y: 0=top-left … 1=bottom-right anchor for crop window
PRESETS = {
    'grid-30.jpg': {
        'src': 'public/restaurant/17-astice-sera.jpg',
        'zoom': 0.88,
        'x': 0.52,
        'y': 1.0,
    },
    'grid-05.jpg': {
        'src': 'public/restaurant/08-risotto.jpg',
        'zoom': 0.62,
        'x': 0.52,
        'y': 0.40,
    },
    'grid-12.jpg': {
        'src': 'public/restaurant/16-guazzetto-mare.jpg',
        'zoom': 0.86,
        'x': 0.50,
        'y': 0.52,
    },
    'grid-23.jpg': {
        'src': 'public/restaurant/18-linguine-gamberi.jpg',
        'zoom': 1.0,
        'x': 0.50,
        'y': 0.50,
    },
}


def smart_square(src: Path, out: Path, *, zoom: float, x: float, y: float) -> None:
    im = Image.open(src).convert('RGB')
    w, h = im.size
    side = max(1, int(min(w, h) * zoom))
    max_left = w - side
    max_top = h - side
    left = int(max_left * x) if max_left > 0 else 0
    top = int(max_top * y) if max_top > 0 else 0
    im = im.crop((left, top, left + side, top + side)).resize(
        (SIZE, SIZE), Image.Resampling.LANCZOS
    )
    im.save(out, 'JPEG', quality=90, optimize=True, progressive=True, subsampling=0)


def manual_square(src: Path, out: Path, *, left: int, top: int, side: int) -> None:
    im = Image.open(src).convert('RGB')
    im = im.crop((left, top, left + side, top + side)).resize(
        (SIZE, SIZE), Image.Resampling.LANCZOS
    )
    im.save(out, 'JPEG', quality=90, optimize=True, progressive=True, subsampling=0)


def main() -> None:
    for name, cfg in PRESETS.items():
        src = ROOT / cfg['src']
        out = OUT / name
        if 'left' in cfg:
            manual_square(src, out, left=cfg['left'], top=cfg['top'], side=cfg['side'])
        else:
            smart_square(src, out, zoom=cfg['zoom'], x=cfg['x'], y=cfg['y'])
        kb = out.stat().st_size / 1024
        print(f'{name} <- {cfg["src"]} ({kb:.0f} KB)')


if __name__ == '__main__':
    main()

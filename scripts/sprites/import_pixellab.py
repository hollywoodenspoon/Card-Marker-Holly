"""Imports a PixelLab 8-direction character export as a base's standing frames.
Run from the repo root: python3 scripts/sprites/import_pixellab.py <folder of PNGs> <name>
Writes art/sprites/parts/<name>-stand.png: 8 rows (S, SE, E, NE, N, NW, W, SW) x 2 frames
(standing, breathing), every frame moved so the lowest foot pixel is on row 59."""
import os, sys
from PIL import Image

N, FOOT = 64, 59
DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']


def settle(img):
    """Moves the sprite so its lowest pixel sits on the foot row."""
    box = img.getbbox()
    out = Image.new('RGBA', (N, N))
    out.alpha_composite(img, (0, FOOT - (box[3] - 1)))
    return out


def breathe(cell):
    """The upper body (above the hips, ~42% up from the feet) 1 px lower; legs unchanged."""
    box = cell.getbbox()
    waist = FOOT - round((box[3] - box[1]) * 0.42)
    out = cell.copy()
    out.paste(Image.new('RGBA', (N, waist)), (0, 0))
    out.alpha_composite(cell.crop((0, 0, N, waist - 1)), (0, 1))
    return out


if __name__ == '__main__':
    src, name = sys.argv[1], sys.argv[2]
    sheet = Image.new('RGBA', (N * 2, N * len(DIRS)))
    for r, d in enumerate(DIRS):
        cell = settle(Image.open(os.path.join(src, d + '.png')).convert('RGBA'))
        sheet.alpha_composite(cell, (0, r * N))
        sheet.alpha_composite(breathe(cell), (N, r * N))
    os.makedirs('art/sprites/parts', exist_ok=True)
    sheet.save(f'art/sprites/parts/{name}-stand.png')

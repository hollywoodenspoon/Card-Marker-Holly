"""Imports a PixelLab 8-direction character export (the unzipped folder) into a base.
Run from the repo root: python3 scripts/sprites/import_pixellab.py <folder> <name>
Writes art/sprites/parts/<name>-stand.png: 8 rows (S, SE, E, NE, N, NW, W, SW) x 2 frames
(standing, breathing) of 96 x 96 (PixelLab's animation canvas: the 64 x 64 character with 16 px
of room on every side), every frame moved so the lowest foot pixel is on row 79.
Each PixelLab animation in <folder>/animations/<Anim>/<direction>/frame_NNN.png becomes
art/sprites/parts/<name>-<anim>.png (8 rows x its frames). Each direction's frames move
together, by one amount (their usual foot row onto row 79), so the animation's own bob and
jumps are kept."""
import os, sys
from PIL import Image

N, FOOT = 96, 79
DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']


def moved(img, dy):
    """Moves the sprite down by dy, centred on the 96 x 96 canvas (64 x 64 images get 16 px of room)."""
    out = Image.new('RGBA', (N, N))
    pad = (N - img.width) // 2
    out.paste(img, (pad, pad + dy), img)
    return out


def foot_dy(imgs):
    """One move for a direction's frames: their middle lowest row onto the foot row."""
    pad = (N - imgs[0].width) // 2
    bottoms = sorted(i.getbbox()[3] - 1 + pad for i in imgs)
    return FOOT - bottoms[len(bottoms) // 2]


# PixelLab's animation names -> ours.
ANIM_NAMES = {'Walking': 'walk', 'Walk': 'walk'}


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
    os.makedirs('art/sprites/parts', exist_ok=True)
    sheet = Image.new('RGBA', (N * 2, N * len(DIRS)))
    for r, d in enumerate(DIRS):
        img = Image.open(os.path.join(src, d + '.png')).convert('RGBA')
        cell = moved(img, foot_dy([img]))
        sheet.alpha_composite(cell, (0, r * N))
        sheet.alpha_composite(breathe(cell), (N, r * N))
    sheet.save(f'art/sprites/parts/{name}-stand.png')
    anim_root = os.path.join(src, 'animations')
    for folder in sorted(os.listdir(anim_root)) if os.path.isdir(anim_root) else []:
        anim = ANIM_NAMES.get(folder, folder.lower())
        frames = {d: sorted(os.listdir(os.path.join(anim_root, folder, d))) for d in DIRS}
        count = len(frames[DIRS[0]])
        strip = Image.new('RGBA', (N * count, N * len(DIRS)))
        for r, d in enumerate(DIRS):
            imgs = [Image.open(os.path.join(anim_root, folder, d, f)).convert('RGBA') for f in frames[d]]
            dy = foot_dy(imgs)
            for i, img in enumerate(imgs):
                strip.alpha_composite(moved(img, dy), (i * N, r * N))
        strip.save(f'art/sprites/parts/{name}-{anim}.png')
        print(anim, count, 'frames')

"""Builds <name>.png, .aseprite and .json from the strips in art/sprites/parts/
(<name>-stand.png from import_pixellab.py, plus any other animations listed in ANIMS).
Run from the repo root: python3 scripts/sprites/build.py <name>   (e.g. base-neutral)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
import ase

D = 'art/sprites/'
N = 64
# All 8 directions are drawn (PixelLab), so nothing is mirrored and the weapon hand is
# always the character's right hand.
V = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
# Which image side the right hand is on, and whether the body hides it (facing away from it).
SIDE = {'south': 'left', 'south-east': 'left', 'east': 'left', 'north-east': 'right',
        'north': 'right', 'north-west': 'right', 'west': 'right', 'south-west': 'left'}
BEHIND = {'south': False, 'south-east': False, 'east': False, 'north-east': False,
          'north': False, 'north-west': True, 'west': True, 'south-west': True}
# Each animation: (strip name in parts/, frames, frame times in ms, hand y-offset per frame, tag colour)
ANIMS = [
    ('stand', 2, [500, 400], [0, 1], (120, 160, 220)),
    ('walk', 4, [170, 170, 170, 170], [0, -1, 0, -1], (120, 200, 140)),
]
# Set by eye where the automatic guess (hand_point) lands off the fist.
OVERRIDES = {}


def hand_point(cell, side):
    """The lowest pixel of the outermost arm on that side, between the waist and the knees."""
    px = cell.load()
    box = cell.getbbox()
    top = box[1] + (box[3] - box[1]) // 2
    pts = [(x, y) for y in range(top, top + 10) for x in range(N) if px[x, y][3]]
    edge = min(p[0] for p in pts) if side == 'left' else max(p[0] for p in pts)
    near = [p for p in pts if abs(p[0] - edge) <= 3]
    x, y = max(near, key=lambda p: p[1])
    return (x + (2 if side == 'left' else -2), y - 1)


NAME = sys.argv[1] if len(sys.argv) > 1 else 'base-neutral'
anims = [a for a in ANIMS if os.path.exists(f'{D}parts/{NAME}-{a[0]}.png')]
stand = Image.open(f'{D}parts/{NAME}-stand.png')
HANDS = dict(OVERRIDES.get(NAME, {}))
for r, v in enumerate(V):
    HANDS.setdefault(v, hand_point(stand.crop((0, r * N, N, r * N + N)), SIDE[v]))

cols = max(a[1] for a in anims)
sheet = Image.new('RGBA', (N * cols, N * len(V) * len(anims)))
frames, tags = [], []
meta = {'frame': {'w': N, 'h': N}, 'baseline': N - 5, 'views': V, 'mirror': {}, 'animations': {}}
for ai, (anim, count, ms, dy, colour) in enumerate(anims):
    strip = Image.open(f'{D}parts/{NAME}-{anim}.png')
    views = {}
    for r, v in enumerate(V):
        start = len(frames)
        x, y = HANDS[v]
        for f in range(count):
            body = strip.crop((f * N, r * N, f * N + N, r * N + N))
            sheet.alpha_composite(body, (f * N, (ai * len(V) + r) * N))
            hp = Image.new('RGBA', (N, N))
            hp.putpixel((x, y + dy[f]), (255, 0, 0, 255))
            frames.append({0: body, 1: hp})
        tags.append((f'{anim}-{v}', start, start + count - 1, colour))
        views[v] = {'tag': f'{anim}-{v}', 'row': ai * len(V) + r,
                    'hand': [[x, y + dy[f]] for f in range(count)], 'weaponBehind': BEHIND[v]}
    meta['animations'][anim] = {'frames': count, 'ms': ms, 'loop': True, 'views': views}
sheet.save(f'{D}{NAME}.png')
ase.write(f'{D}{NAME}.aseprite', ['Body', 'Hand points'], frames, tags, N, N, 450)
assert ase.read(f'{D}{NAME}.aseprite')[0] == len(frames)
json.dump(meta, open(f'{D}{NAME}.json', 'w'), indent=1)
print(NAME, len(frames), 'frames')

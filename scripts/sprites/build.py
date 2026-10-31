"""Builds <name>.aseprite and <name>.json from <name>.png (run cleanup.py first).
Run from the repo root: python3 scripts/sprites/build.py <name>   (base-male, base-female)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
import ase

D = 'art/sprites/'
V = ['front', 'front34', 'side', 'back34', 'back']
N = 64
# Which side of the image the weapon hand (the character's right hand) is on, per view.
SIDE = {'front': 'left', 'front34': 'left', 'side': 'left', 'back34': 'right', 'back': 'right'}
BEHIND = {'front': False, 'front34': True, 'side': True, 'back34': False, 'back': False}

def hand_point(cell, side):
    """The lowest pixel of the outermost arm on that side, between the waist and the knees."""
    px = cell.load()
    pts = [(x, y) for y in range(30, 48) for x in range(N) if px[x, y][3]]
    edge = min(p[0] for p in pts) if side == 'left' else max(p[0] for p in pts)
    near = [p for p in pts if abs(p[0] - edge) <= 3]
    x, y = max(near, key=lambda p: p[1])
    return (x + (2 if side == 'left' else -2), y - 1)

NAME = sys.argv[1] if len(sys.argv) > 1 else 'base-male'
# Each animation: (strip in parts/, frame count, frame times in ms, hand y-offset per frame, colour of its tags)
ANIMS = [
    ('stand', 2, [500, 400], [0, 1], (120, 160, 220)),
    ('walk', 4, [170, 170, 170, 170], [0, -1, 0, -1], (120, 200, 140)),
]
COLS = max(a[1] for a in ANIMS)
# Set by eye where the automatic guess (hand_point) lands off the fist.
OVERRIDES = {
    'base-male': {'side': (33, 38), 'back34': (41, 40), 'back': (42, 42)},
    'base-female': {'side': (34, 41), 'back34': (42, 38), 'back': (42, 41)},
}
frames, tags = [], []
HANDS = dict(OVERRIDES.get(NAME, {}))
meta = {'frame': {'w': N, 'h': N}, 'baseline': N - 5, 'views': V,
        'mirror': {'front34': 'front-right34', 'side': 'right', 'back34': 'back-right34'},
        'animations': {}}
stand = Image.open(D + 'parts/' + NAME + '-stand.png')
for r, v in enumerate(V):
    HANDS.setdefault(v, hand_point(stand.crop((0, r * N, N, r * N + N)), SIDE[v]))
sheet = Image.new('RGBA', (N * COLS, N * len(V) * len(ANIMS)))
for ai, (anim, count, ms, dy, colour) in enumerate(ANIMS):
    strip = Image.open(D + 'parts/' + NAME + '-' + anim + '.png')
    views = {}
    for r, v in enumerate(V):
        start = len(frames)
        x, y = HANDS[v]
        for f in range(count):
            body = strip.crop((f * N, r * N, f * N + N, r * N + N))
            sheet.alpha_composite(body, (f * N, (ai * len(V) + r) * N))
            hp = Image.new('RGBA', (N, N), (0, 0, 0, 0))
            hp.putpixel((x, y + dy[f]), (255, 0, 0, 255))
            frames.append({0: body, 1: hp})
        tags.append((f'{anim}-{v}', start, start + count - 1, colour))
        views[v] = {'tag': f'{anim}-{v}', 'row': ai * len(V) + r,
                    'hand': [[x, y + dy[f]] for f in range(count)], 'weaponBehind': BEHIND[v]}
    meta['animations'][anim] = {'frames': count, 'ms': ms, 'loop': True, 'views': views}
sheet.save(D + NAME + '.png')
ase.write(D + NAME + '.aseprite', ['Body', 'Hand points'], frames, tags, N, N, 450)
assert ase.read(D + NAME + '.aseprite')[0] == len(frames)
json.dump(meta, open(D + NAME + '.json', 'w'), indent=1)

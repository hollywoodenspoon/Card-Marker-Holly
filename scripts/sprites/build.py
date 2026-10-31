"""Builds base-template.aseprite, .png and .json from base-stand.png (run cleanup.py first).
Run from the repo root: python3 scripts/sprites/build.py"""
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

sheet = Image.open(D + 'base-stand.png')
sheet.save(D + 'base-template.png')
frames, tags = [], []
# Set by eye where the automatic guess (hand_point) lands off the fist.
HANDS = {'side': (33, 38), 'back34': (41, 40), 'back': (42, 42)}
meta = {'frame': {'w': N, 'h': N}, 'baseline': N - 5, 'views': V,
        'mirror': {'front34': 'front-right34', 'side': 'right', 'back34': 'back-right34'},
        'animations': {}}
for r, v in enumerate(V):
    start = len(frames)
    for f in range(2):
        body = sheet.crop((f * N, r * N, f * N + N, r * N + N))
        hp = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        HANDS.setdefault(v, hand_point(body, SIDE[v]))
        x, y = HANDS[v]
        hp.putpixel((x, y + f), (255, 0, 0, 255))
        frames.append({0: body, 1: hp})
    tags.append((f'stand-{v}', start, start + 1, (120, 160, 220)))
meta['animations']['stand'] = {
    'frames': 2, 'ms': [500, 400], 'loop': True,
    'views': {v: {'tag': f'stand-{v}', 'hand': [[HANDS[v][0], HANDS[v][1] + f] for f in range(2)],
                  'weaponBehind': BEHIND[v]} for v in V}}
ase.write(D + 'base-template.aseprite', ['Body', 'Hand points'], frames, tags, N, N, 450)
assert ase.read(D + 'base-template.aseprite')[0] == len(frames)
json.dump(meta, open(D + 'base-template.json', 'w'), indent=1)

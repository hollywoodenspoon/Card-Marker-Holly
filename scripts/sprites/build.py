"""Builds base-template.aseprite and .json from base-template.png (run draw.py first).
Run from the repo root: python3 scripts/sprites/draw.py && python3 scripts/sprites/build.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
import ase

D = 'art/sprites/'
V = ['front', 'front34', 'side', 'back34', 'back']
# The weapon hand (the character's right hand) per view, standing frame; breathing is 1 px lower.
HANDS = {'front': (17, 33), 'front34': (19, 33), 'side': (24, 33), 'back34': (29, 33), 'back': (31, 33)}
BEHIND = {'front': False, 'front34': True, 'side': True, 'back34': False, 'back': False}

sheet = Image.open(D + 'base-template.png')
frames, tags = [], []
meta = {'frame': {'w': 48, 'h': 48}, 'baseline': 43, 'views': V,
        'mirror': {'front34': 'front-right34', 'side': 'right', 'back34': 'back-right34'},
        'animations': {}}
for r, v in enumerate(V):
    start = len(frames)
    for f in range(2):
        body = sheet.crop((f * 48, r * 48, f * 48 + 48, r * 48 + 48))
        hp = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
        x, y = HANDS[v]
        hp.putpixel((x, y + f), (255, 0, 0, 255))
        frames.append({0: body, 1: hp})
    tags.append((f'stand-{v}', start, start + 1, (120, 160, 220)))
meta['animations']['stand'] = {
    'frames': 2, 'ms': [500, 400], 'loop': True,
    'views': {v: {'tag': f'stand-{v}', 'hand': [[HANDS[v][0], HANDS[v][1] + f] for f in range(2)],
                  'weaponBehind': BEHIND[v]} for v in V}}
ase.write(D + 'base-template.aseprite', ['Body', 'Hand points'], frames, tags, 48, 48, 450)
assert ase.read(D + 'base-template.aseprite')[0] == len(frames)
json.dump(meta, open(D + 'base-template.json', 'w'), indent=1)

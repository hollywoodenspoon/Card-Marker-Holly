"""Imports a PixelLab character export (the unzipped folder) into a base.
Run from the repo root: python3 scripts/sprites/import_pixellab.py <folder> <name>

PixelLab's layout: one folder per state (a held pose), each with rotations/<direction>.png and
animations/<Animation>/<direction>[-<id>]/frame_NNN.png. (Older exports keep the first state's
rotations at the top level, and other states under states/.) Every pose and animation becomes
art/sprites/parts/<name>-<key>.png: 8 rows (S, SE, E, NE, N, NW, W, SW), 96 x 96 frames (the
64 x 64 character with 16 px of room on every side), feet on row 79. Each direction's frames move
together, so an animation's own bob and jumps are kept. White effect streaks (slash arcs) are
removed. Animations missing a direction are skipped and reported."""
import os, sys
from collections import deque
from PIL import Image

N, FOOT = 96, 79
DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
# PixelLab names (folder names start with these) -> our keys.
STATE_KEYS = {
    'Idle': 'stand', 'Going_into_combat': 'ready', 'Fighting_pose': 'ready',
    'Kneeling': 'kneel', 'Knocked_out_face_up': 'down-up', 'Knocked_out_on_the_g': 'down-face',
    'About_to_jump': 'pose-jump', 'About_to_dodge': 'pose-dodge', 'About_to_slash': 'pose-slash',
    'About_to_stab': 'pose-stab',
}
ANIM_KEYS = {
    'Walking': 'walk', 'Walk': 'walk', 'Cross_Punch': 'punch',
    'The_character_lunges_forward_while_the_right_arm_s': 'slash',
    'The_character_initiates_a_sharp_reactive_shift_by': 'dodge',
}


def key_for(name, table):
    return next((v for k, v in table.items() if name.startswith(k)), name.lower())


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


def strip_streaks(img):
    """Removes white effect strokes: pure-white areas that touch the empty background
    (the body's own white highlights always sit inside its dark outline)."""
    img = img.copy(); p = img.load(); w, h = img.size
    white = lambda x, y: p[x, y][3] and p[x, y][:3] == (255, 255, 255)
    seen = set()
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or not white(x, y): continue
            blob, q, touches = [], deque([(x, y)]), False
            seen.add((x, y))
            while q:
                a, b = q.popleft(); blob.append((a, b))
                for n in ((a+1, b), (a-1, b), (a, b+1), (a, b-1)):
                    if not (0 <= n[0] < w and 0 <= n[1] < h) or not p[n][3]:
                        touches = True
                    elif n not in seen and white(*n):
                        seen.add(n); q.append(n)
            if touches:
                for c in blob: p[c] = (0, 0, 0, 0)
    return img


def breathe(cell):
    """The upper body (above the hips, ~42% up from the feet) 1 px lower; legs unchanged."""
    box = cell.getbbox()
    waist = FOOT - round((box[3] - box[1]) * 0.42)
    out = cell.copy()
    out.paste(Image.new('RGBA', (N, waist)), (0, 0))
    out.alpha_composite(cell.crop((0, 0, N, waist - 1)), (0, 1))
    return out


def states(src):
    """(folder name, folder path) for every state in the export."""
    if os.path.isdir(os.path.join(src, 'rotations')) or os.path.exists(os.path.join(src, 'south.png')):
        yield 'Idle', src  # old layout: the first state at the top level
    for root in (src, os.path.join(src, 'states')):
        if not os.path.isdir(root): continue
        for f in sorted(os.listdir(root)):
            path = os.path.join(root, f)
            if f not in ('animations', 'states', 'rotations') and os.path.isdir(os.path.join(path, 'rotations')):
                yield f, path


def rotation(path, d):
    for p in (os.path.join(path, 'rotations', d + '.png'), os.path.join(path, d + '.png')):
        if os.path.exists(p): return Image.open(p).convert('RGBA')
    return None


def animation_dirs(folder):
    """direction -> its frame folder (the first one if PixelLab made a direction twice)."""
    out = {}
    for f in sorted(os.listdir(folder)):
        base = next((d for d in sorted(DIRS, key=len, reverse=True) if f == d or f.startswith(d + '-')), None)
        if base and base not in out: out[base] = os.path.join(folder, f)
    return out


def save_strip(rows, path):
    count = max(len(r) for r in rows)
    strip = Image.new('RGBA', (N * count, N * len(DIRS)))
    for r, frames in enumerate(rows):
        for i, f in enumerate(frames): strip.alpha_composite(f, (i * N, r * N))
    strip.save(path)
    return count


if __name__ == '__main__':
    src, name = sys.argv[1], sys.argv[2]
    out = 'art/sprites/parts'
    os.makedirs(out, exist_ok=True)
    for folder, path in states(src):
        key = key_for(folder, STATE_KEYS)
        imgs = [rotation(path, d) for d in DIRS]
        if all(imgs):
            cells = [moved(i, foot_dy([i])) for i in imgs]
            rows = [[c, breathe(c)] for c in cells] if key == 'stand' else [[c] for c in cells]
            print(key, save_strip(rows, f'{out}/{name}-{key}.png'), 'frame(s)')
        anim_root = os.path.join(path, 'animations')
        for af in sorted(os.listdir(anim_root)) if os.path.isdir(anim_root) else []:
            akey = key_for(af, ANIM_KEYS)
            dirs = animation_dirs(os.path.join(anim_root, af))
            missing = [d for d in DIRS if d not in dirs]
            if missing:
                print(f'skipped {akey} (from {folder}): missing {", ".join(missing)}')
                continue
            rows = []
            for d in DIRS:
                frames = [strip_streaks(Image.open(os.path.join(dirs[d], f)).convert('RGBA'))
                          for f in sorted(os.listdir(dirs[d])) if f.endswith('.png')]
                dy = foot_dy(frames)
                rows.append([moved(f, dy) for f in frames])
            print(akey, save_strip(rows, f'{out}/{name}-{akey}.png'), 'frames')

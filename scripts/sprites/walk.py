"""Makes the 4-frame walk for a base from its standing frames, by moving body parts:
the legs swing (sheared from the hip, so they stay attached) or lift, the arms swing the
other way, and the body bobs 1 px on the passing frames.
Run from the repo root: python3 scripts/sprites/walk.py <name>   (base-male, base-female)
Reads art/sprites/parts/<name>-stand.png, writes art/sprites/parts/<name>-walk.png."""
import sys
from PIL import Image

N = 64
FOOT = N - 5  # the feet's bottom row
VIEWS = ['front', 'front34', 'side', 'back34', 'back']
# How far the feet swing apart (px, at the feet) and how high a trailing foot lifts, per view.
SWING = {'front': 0, 'front34': 2, 'side': 3, 'back34': 2, 'back': 0}
LIFT = {'front': 3, 'front34': 2, 'side': 1, 'back34': 2, 'back': 3}
ARM = {'front': 0, 'front34': 1, 'side': 2, 'back34': 1, 'back': 0}


def segments(px, y):
    runs, start = [], None
    for x in range(N + 1):
        on = x < N and px[x, y][3]
        if on and start is None: start = x
        if not on and start is not None: runs.append((start, x - 1)); start = None
    return runs


def hip_row(cell):
    """The first row below the hands (front view): from there down there are only legs."""
    px = cell.load()
    rows = [y for y in range(N // 3, FOOT) if len(segments(px, y)) >= 3]
    return (max(rows) + 1) if rows else FOOT - 16


def split(cell, hip):
    """Legs (left/right of the leg area's middle), arms (outer segments above the hip), body."""
    px = cell.load()
    blank = lambda: Image.new('RGBA', (N, N))
    legs = [blank(), blank()]; arms = [blank(), blank()]; body = blank()
    lp = [l.load() for l in legs]; ap = [a.load() for a in arms]; bp = body.load()
    xs = [x for y in range(hip, FOOT + 1) for x in range(N) if px[x, y][3]]
    mid = (min(xs) + max(xs)) / 2 if xs else N / 2
    for y in range(N):
        runs = segments(px, y)
        for x in range(N):
            if not px[x, y][3]: continue
            if y >= hip:
                lp[0 if x < mid else 1][x, y] = px[x, y]
            elif y >= hip - 14 and len(runs) >= 3 and x <= runs[0][1]:
                ap[0][x, y] = px[x, y]
            elif y >= hip - 14 and len(runs) >= 3 and x >= runs[-1][0]:
                ap[1][x, y] = px[x, y]
            else:
                bp[x, y] = px[x, y]
    return legs, arms, body


def shear(img, top, bottom, dx, dy=0):
    """Moves rows top..bottom sideways, more toward the bottom (0 at top, dx at bottom), and down by dy."""
    out = Image.new('RGBA', (N, N)); src = img.load(); dst = out.load()
    for y in range(N):
        t = 0 if y <= top else min(1, (y - top) / max(1, bottom - top))
        off = round(dx * t)
        for x in range(N):
            c = src[x, y]
            if not c[3]: continue
            nx, ny = x + off, y + dy
            if 0 <= nx < N and 0 <= ny < N: dst[nx, ny] = c
    return out


def lift(leg, hip, up):
    """Raises a leg: the foot comes up, the top stays tucked under the shorts."""
    out = Image.new('RGBA', (N, N))
    out.paste(leg, (0, -up), leg)
    p = out.load()
    for y in range(0, hip):
        for x in range(N): p[x, y] = (0, 0, 0, 0)
    return out


def darken(img, k=0.78):
    out = img.copy(); p = out.load()
    for y in range(N):
        for x in range(N):
            r, g, b, a = p[x, y]
            if a: p[x, y] = (int(r * k), int(g * k), int(b * k), a)
    return out


def walk(cell, view, hip):
    legs, arms, body = split(cell, hip)
    sw, lf, am = SWING[view], LIFT[view], ARM[view]
    # side views: "forward" is to the left (all views face left)
    frames = []
    for i in range(4):
        f = Image.new('RGBA', (N, N))
        bob = 1 if i % 2 else 0
        lead = 0 if i == 0 else 1  # which leg is forward on a contact frame
        if view == 'side':
            # From the side the legs overlap, so each step uses the whole leg shape twice:
            # the far leg darker, behind; the near leg in front.
            whole = Image.new('RGBA', (N, N))
            for leg in legs: whole.alpha_composite(leg)
            if bob:
                f.alpha_composite(whole.crop((0, hip, N, hip + 1)), (0, hip - 1))
                f.alpha_composite(whole)
            else:
                far = lift(shear(whole, hip, FOOT, sw if lead == 0 else -sw), hip, lf if lead == 0 else 0)
                near = lift(shear(whole, hip, FOOT, -sw if lead == 0 else sw), hip, 0 if lead == 0 else lf)
                f.alpha_composite(darken(far))
                f.alpha_composite(near)
            legs_done = True
        else:
            legs_done = False
        for k, leg in enumerate(legs if not legs_done else []):
            if bob:
                l = leg
                f.alpha_composite(leg.crop((0, hip, N, hip + 1)), (0, hip - 1))  # fill under the raised body
            else:
                forward = k == lead
                l = shear(leg, hip, FOOT, -sw if forward else sw)
                if not forward: l = lift(l, hip, lf)
            f.alpha_composite(l)
        f.alpha_composite(shear(body, 0, 0, 0, -bob))
        for k, arm in enumerate(arms):
            box = arm.getbbox()
            if not box:
                continue
            # arms swing opposite to the legs; front/back views move the arm up/down instead
            forward = (k != lead) if not bob else None
            if forward is None:
                a = shear(arm, 0, 0, 0, -bob)
            elif am:
                a = shear(arm, box[1], box[3], -am if forward else am)
            else:
                a = shear(arm, 0, 0, 0, 1 if forward else -1)
            f.alpha_composite(a)
        frames.append(f)
    return frames


if __name__ == '__main__':
    name = sys.argv[1]
    stand = Image.open(f'art/sprites/parts/{name}-stand.png').convert('RGBA')
    cells = [stand.crop((0, r * N, N, r * N + N)) for r in range(5)]
    hip = hip_row(cells[0])
    sheet = Image.new('RGBA', (N * 4, N * 5))
    for r, v in enumerate(VIEWS):
        for i, f in enumerate(walk(cells[r], v, hip)):
            sheet.alpha_composite(f, (i * N, r * N))
    sheet.save(f'art/sprites/parts/{name}-walk.png')
    print(name, 'hip row', hip)

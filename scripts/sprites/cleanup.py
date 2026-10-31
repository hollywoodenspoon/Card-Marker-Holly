"""Turns a Gemini turnaround (5 views in a row on magenta) into a clean 64 x 64 sprite strip.
Run from the repo root: python3 scripts/sprites/cleanup.py <image> [flip views, e.g. 234]
Writes art/sprites/base-stand.png (5 views x 2 frames: standing, breathing)."""
import sys
from collections import deque
from PIL import Image

CELL, TALL, FOOT = 64, 56, 4  # frame size, body height, gap under the feet

def is_bg(c):
    r, g, b = c[:3]
    return r > 140 and b > 140 and g < 130 and abs(r - b) < 100

def largest_blob(mask, w, h):
    seen, best = set(), set()
    for y in range(h):
        for x in range(w):
            if mask[y][x] and (x, y) not in seen:
                blob, q = set(), deque([(x, y)])
                seen.add((x, y))
                while q:
                    a, b = q.popleft(); blob.add((a, b))
                    for n in ((a+1,b),(a-1,b),(a,b+1),(a,b-1)):
                        if 0 <= n[0] < w and 0 <= n[1] < h and mask[n[1]][n[0]] and n not in seen:
                            seen.add(n); q.append(n)
                if len(blob) > len(best): best = blob
    return best

def figures(im, flip):
    W, H = im.size
    px = im.load()
    out = []
    for i in range(5):
        x0, x1 = W * i // 5, W * (i + 1) // 5
        # skip the thin divider lines Gemini sometimes draws at cell edges
        x0 += 6; x1 -= 6
        mask = [[not is_bg(px[x, y]) for x in range(x0, x1)] for y in range(H)]
        blob = largest_blob(mask, x1 - x0, H)
        xs = [p[0] for p in blob]; ys = [p[1] for p in blob]
        bx0, bx1, by0, by1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
        fig = Image.new('RGBA', (bx1 - bx0, by1 - by0))
        fp = fig.load()
        for (x, y) in blob:
            fp[x - bx0, y - by0] = px[x0 + x, y][:3] + (255,)
        if str(i + 1) in flip: fig = fig.transpose(Image.FLIP_LEFT_RIGHT)
        out.append(fig)
    return out

def to_cell(fig, scale):
    w, h = max(1, round(fig.width * scale)), max(1, round(fig.height * scale))
    small = fig.resize((w, h), Image.BOX)
    sp = small.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            sp[x, y] = (r, g, b, 255 if a > 140 else 0)
    cell = Image.new('RGBA', (CELL, CELL))
    cell.alpha_composite(small, ((CELL - w) // 2, CELL - FOOT - h))
    return cell

def breathe(cell, waist):
    """The upper body 1 px lower (rows above the waist), legs unchanged."""
    out = cell.copy()
    upper = cell.crop((0, 0, CELL, waist))
    clear = Image.new('RGBA', (CELL, waist))
    out.paste(clear, (0, 0))
    out.alpha_composite(upper.crop((0, 0, CELL, waist - 1)), (0, 1))
    return out

if __name__ == '__main__':
    im = Image.open(sys.argv[1]).convert('RGB')
    flip = sys.argv[2] if len(sys.argv) > 2 else ''
    figs = figures(im, flip)
    scale = TALL / max(f.height for f in figs)   # one scale for all views, so sizes match
    cells = [to_cell(f, scale) for f in figs]
    waist = CELL - FOOT - round(TALL * 0.42)
    sheet = Image.new('RGBA', (CELL * 2, CELL * 5))
    for r, c in enumerate(cells):
        sheet.alpha_composite(c, (0, r * CELL))
        sheet.alpha_composite(breathe(c, waist), (CELL, r * CELL))
    # one shared palette
    rgb = sheet.convert('RGB').quantize(48, method=Image.Quantize.FASTOCTREE).convert('RGB')
    rgb.putalpha(sheet.getchannel('A'))
    rgb.save('art/sprites/base-stand.png')
    big = rgb.resize((rgb.width * 6, rgb.height * 6), Image.NEAREST)
    bg = Image.new('RGBA', big.size, (70, 74, 84, 255)); bg.alpha_composite(big)
    bg.save('art/sprites/base-stand-preview.png')
    print('waist row', waist, 'scale', round(scale, 4))

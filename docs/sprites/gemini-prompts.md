# Base character template: Gemini prompt pack

These prompts are for making a plain base character in the spirit of 1990s isometric tactics games, to edit later in Aseprite. Paste them into Gemini one at a time.

## How to use

1. Run **Prompt 1** (the style anchor) a few times and keep the result you like best.
2. Run **Prompt 2** once per animation, with the anchor image attached each time. Change only the lines marked `◆`.
3. If a sheet comes out wrong, paste a **fix-up line** in the same chat.
4. Send me every sheet you keep. I'll clean them up and cut them into frames for the Engine.

## Sizes (what everything is built around)

- **A final frame** is 32 × 48 px.
- **Gemini draws everything 8× larger:** each sprite pixel is an 8 × 8 block, so one frame cell is **256 × 384 px**.
- **Rows are the 5 drawn views, always in this order:**
  1. Front (facing the viewer)
  2. Front-left ¾
  3. Left (full side)
  4. Back-left ¾
  5. Back (facing away)

  The right-facing views are mirrored by the Engine.
- **Canvas** = (frames × 256) wide × 1920 tall (5 rows × 384).

| Animation | Frames | Canvas (W × H) | What happens |
| --- | --- | --- | --- |
| Stand | 2 | 512 × 1920 | Idle breathing: frame 2 has the shoulders and chest 1 sprite-pixel lower |
| Walk | 4 | 1024 × 1920 | Contact (left foot forward), passing, contact (right foot forward), passing |
| Attack (swing) | 3 | 768 × 1920 | Wind-up with the weapon raised behind; mid-swing; follow-through, arm low and forward |
| Hold weapon out | 2 | 512 × 1920 | Arm straight out holding a short stick at chest height; frame 2 has a slight forward lean |
| Cast / use item | 2 | 512 × 1920 | Both hands raised to chest; then both arms raised up and forward |
| Emote: talk | 2 | 512 × 1920 | Head slightly up; head nod down 1 sprite-pixel |
| Emote: surprised | 1 | 256 × 1920 | Arms out a little, leaning back, eyes wide |
| Emote: cheer | 2 | 512 × 1920 | One fist raised; both arms raised |
| Emote: sad | 1 | 256 × 1920 | Head down, shoulders slumped |
| Sit | 1 | 256 × 1920 | Sitting on the ground, knees up |
| Hurt | 1 | 256 × 1920 | Recoiling backwards, one eye shut |
| Knocked out | 1 | 256 × 1920 | Lying on the ground, face down, inside the cell |

The weapon is a plain short brown stick (a placeholder you'll repaint), held in the character's right hand.

---

## Prompt 1: style anchor

```
Create a single pixel-art game character sprite, drawn at 8x scale: every sprite pixel is
an exact 8 by 8 block of one flat colour, with crisp square edges, no anti-aliasing, no
blur, no gradients and no dithering noise.

Image size: exactly 256 pixels wide by 384 pixels tall. That is a 32 by 48 sprite-pixel
grid. The character fills the cell. The feet rest on sprite-pixel row 46 (image y = 368),
and the head top is near sprite-pixel row 4. The character is horizontally centred.

Style: in the spirit of late-1990s isometric tactics RPG sprites. Small, chunky, slightly
stylised proportions, about 2.5 heads tall, with a large head, short legs and simple hands.
A soft, hand-painted look made of flat pixel clusters. Lit from the top-left: highlight on
the top-left of each shape, shadow on the bottom-right. A one-pixel dark brown-grey outline
(#2B2228) around the whole figure, with lighter interior lines.

Character: a plain, neutral BASE TEMPLATE for later editing. A gender-neutral young adult
in a short-sleeved plain grey undershirt and plain grey shorts to just above the knee.
Simple bare feet. Skin a light warm tan. Short simple dark-brown hair as a smooth cap shape
with no strands. Simple dot eyes, no mouth detail. No accessories, logos, belts, armour or
weapons. A relaxed standing pose, arms at the sides, facing the viewer directly (front
view).

Palette: at most 16 colours in total, including the outline. Grey cloth uses 3 shades
(#8C8C94, #6E6E78, #50505A); skin uses 3 shades; hair uses 2 shades.

Background: one perfectly flat solid magenta, #FF00FF, filling every pixel not covered by
the character. No checkerboard, no ground shadow, no floor, no border, no text, no
watermark, no labels.
```

---

## Prompt 2: one animation sheet (attach the anchor image)

Change the lines marked `◆` using the table above. Leave everything else as it is.

```
Using the attached character EXACTLY (same body, proportions, colours, outline, hair and
grey undershirt and shorts), create a pixel-art sprite sheet drawn at 8x scale: every
sprite pixel is an exact 8 by 8 block of one flat colour. Crisp square edges, no
anti-aliasing, no blur, no gradients.

◆ Animation: WALK
◆ Frames: 4
◆ Image size: exactly 1024 pixels wide by 1920 pixels tall.

Layout: a strict grid of equal cells, each exactly 256 x 384 pixels (32 x 48 sprite
pixels), with no gaps, no gutters, no borders and no grid lines drawn.
◆ There are 4 columns, one per animation frame, left to right in time order.
There are 5 rows, one per viewing direction, top to bottom:
  Row 1: FRONT, facing the viewer.
  Row 2: FRONT-LEFT three-quarter view, body turned 45 degrees to the viewer's left.
  Row 3: LEFT, full side profile facing the viewer's left.
  Row 4: BACK-LEFT three-quarter view, turned away, facing up and to the viewer's left.
  Row 5: BACK, facing directly away from the viewer.

◆ Frames: 1) contact, left foot forward; 2) passing, legs together, body 1 sprite-pixel
◆ higher; 3) contact, right foot forward; 4) passing, legs together, body 1 sprite-pixel
◆ higher. Arms swing opposite to the legs.

Rules for every cell:
- The same character at the same size in every cell; only the pose changes.
- The feet touch the same baseline in every cell: sprite-pixel row 46, which is 368
  pixels from the top of each cell.
- The character stays horizontally centred in its cell and never crosses into another
  cell.
- At most 16 colours, the same palette in every cell.
- A one-pixel dark outline (#2B2228) around the figure, lit from the top-left.
- If a weapon is needed, it is a plain short brown stick in the character's right hand.

Background: one perfectly flat solid magenta, #FF00FF, in every pixel not covered by the
character. No checkerboard, no shadows on the ground, no floor, no text, no numbers, no
labels, no watermark.
```

### The `◆` lines for each animation

- **Stand:** `Animation: STAND (idle breathing)` · `Frames: 2` · `1024`→`512` wide · `2 columns` · "1) relaxed standing, arms at the sides; 2) the same with shoulders and chest 1 sprite-pixel lower."
- **Attack (swing):** `ATTACK (weapon swing)` · `3` · `768` wide · `3 columns` · "1) wind-up, stick raised high behind the shoulder; 2) mid-swing, stick level in front; 3) follow-through, stick low and forward, body leaning in."
- **Hold weapon out:** `HOLD WEAPON OUT` · `2` · `512` wide · `2 columns` · "1) right arm straight out holding the stick level at chest height; 2) the same, leaning forward 1 sprite-pixel."
- **Cast:** `CAST / USE ITEM` · `2` · `512` wide · `2 columns` · "1) both hands together in front of the chest; 2) both arms raised up and forward, palms open."
- **Talk:** `EMOTE TALK` · `2` · `512` wide · `2 columns` · "1) standing, head tilted slightly up; 2) head nodded down 1 sprite-pixel."
- **Surprised:** `EMOTE SURPRISED` · `1` · `256` wide · `1 column` · "Leaning back, arms out a little to the sides, eyes wide."
- **Cheer:** `EMOTE CHEER` · `2` · `512` wide · `2 columns` · "1) right fist raised above the head; 2) both arms raised high."
- **Sad:** `EMOTE SAD` · `1` · `256` wide · `1 column` · "Head down, shoulders slumped, arms hanging."
- **Sit:** `SIT` · `1` · `256` wide · `1 column` · "Sitting on the ground, knees up, arms resting on the knees. The seat touches the baseline."
- **Hurt:** `HURT` · `1` · `256` wide · `1 column` · "Recoiling backwards from a hit, one eye shut, arms up defensively."
- **Knocked out:** `KNOCKED OUT` · `1` · `256` wide · `1 column` · "Lying flat on the ground, face down, fully inside the cell. The body rests on the baseline."

---

## Fix-up lines (paste into the same chat)

- `Keep the exact same image size: W x H pixels, with no extra margin.`
- `Redo row N only. Keep every other row exactly the same.`
- `Remove all ground shadows. The background must be pure flat #FF00FF everywhere.`
- `The feet must touch the same line, 368 pixels from the top of each cell, in every cell.`
- `Use only the colours from the attached character. Do not add new colours.`
- `Every sprite pixel must be an exact 8x8 block. Remove blurry or in-between colours.`
- `Do not draw grid lines, numbers or labels.`

## What I'll make from them

- **`base-template.png`:** 32 × 48 frames on a transparent background, in one shared palette. It has one row per animation per view, in the order of the table above.
- **`base-template.json`:** the frame size, and for each animation its rows, frame count and frame times, with the views the Engine mirrors to get the right-facing ones. It opens in Aseprite with a 32 × 48 grid.

---

## What we used (2026-10-31)

We used the "high camera angle" turnaround prompt in a fresh chat: one row of 5 standing views, 64 × 64 sprite-pixel cells. The Gemini original is in `art/sprites/source/`. Cleanup and build:

```bash
python3 scripts/sprites/cleanup.py art/sprites/source/gemini-male.jpg 234 base-male      # 234 = views to mirror
python3 scripts/sprites/build.py base-male
python3 scripts/sprites/cleanup.py art/sprites/source/gemini-female.jpg 234 base-female
python3 scripts/sprites/build.py base-female
```

The results are `art/sprites/base-male.*` and `base-female.*` (`.png`, `.aseprite`, `.json`), both with the same layout:
- 64 × 64 frames, with the feet on row 59;
- 5 views × the Stand animation (standing + breathing);
- a hand-point layer.

The female base mixes two Gemini images. Front, back-¾ and back come from `gemini-female-large.jpg` (sharper). Front-¾ and side come from `gemini-female.jpg`, because the large image's views 2 and 3 came out broken. Each image is scaled on its own so all views stand 56 px tall.

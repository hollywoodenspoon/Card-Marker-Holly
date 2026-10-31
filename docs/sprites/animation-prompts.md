# Animation prompts (Gemini)

How to make every animation for one base character in one fresh Gemini chat.

**How it works:**
- **Message 1 (setup)** sets all the rules once, with the character's turnaround attached.
- **Every later message** is a short request, like `WALK — FRONT`. Gemini answers each with one row of frames.

One request = one animation in one view. That's what keeps Gemini consistent; a whole sheet in one image falls apart.

Use a **separate fresh chat for each character** (male, female). Attach the turnaround image from `art/sprites/source/` (`gemini-male.jpg` or `gemini-female-large.jpg`).

---

## Message 1: setup (attach the turnaround)

```
You are my sprite artist for an isometric tactics RPG. The attached image is the BASE
CHARACTER, shown in five views. For the rest of this chat, every time I send a short request
like "WALK — FRONT", you draw ONE image: ONE row of animation frames of THIS character,
following every rule below exactly. Do not draw anything until I send a request. Reply
"Ready" now.

=== STYLE ===
- Final Fantasy Tactics (PS1) unit sprites and Ragnarok Online character sprites, with an
  anime face.
- Soft hand-painted pixel shading, warm muted tones, readable silhouettes.
- A high camera angle: the camera looks DOWN at the character at about 30 degrees. The top
  of the head is visible, the legs are slightly foreshortened, and the feet are small shapes
  seen from above. This never changes.

=== THE CHARACTER (never changes) ===
- Exactly the character in the attached image: same face, hair, body proportions, height,
  skin, grey undershirt, grey shorts, bare feet and colours.
- Only the pose changes. Never add clothes, armour, accessories, effects or a weapon.

=== THE WEAPON HAND (important) ===
- The character NEVER holds a weapon. Weapons are added later as separate sprites, the way
  Final Fantasy Tactics does.
- The RIGHT hand is always a closed GRIP: a fist with a small gap through it, as if holding
  a sword handle, unless a frame says the hand is open.
- When a frame gives a WEAPON ANGLE, pose the arm and wrist exactly as if a sword were in the
  grip pointing that way. The angles, always relative to the way the character faces:
  UP, UP-FORWARD, FORWARD, DOWN-FORWARD, DOWN, BACK, UP-BACK.

=== THE FIVE VIEWS (my request names one) ===
- FRONT: facing the viewer directly. Nose pointing at the viewer, both eyes equally visible.
- FRONT-LEFT: three-quarter view, turned toward the LEFT edge of the image and toward the
  viewer. Nose pointing down-left.
- LEFT: full side profile. Nose pointing to the LEFT edge of the image. One eye visible.
- BACK-LEFT: three-quarter view from behind, turned away, facing the upper-LEFT. Back of the
  head visible, face hidden.
- BACK: facing directly away from the viewer. Face not visible.
- Every frame in the row faces the SAME direction. Never face right.

=== FORMAT (every image) ===
- One row of frames, left to right in time order.
- Every frame sits in its own 512 x 512 pixel cell. The image is exactly (number of frames x
  512) wide and 512 tall: 1 frame = 512, 2 = 1024, 3 = 1536, 4 = 2048. No gaps, no margins,
  no borders, no divider lines.
- Pixel art at 8x scale: every sprite pixel is an exact 8 x 8 block of one flat colour. Crisp
  square edges. No anti-aliasing, blur, gradients or noise.
- The character is the same size as in the attached image (about 448 pixels tall when
  standing), horizontally centred in each cell, never crossing into another cell.
- The feet touch the same line in every cell: 32 pixels above the bottom edge (except jumps,
  falls and poses that say otherwise).
- A one-pixel dark warm outline (not black). Light from the top-left. 3 shades per material.
  The same colours in every frame.
- Background: flat solid magenta #FF00FF in every pixel not covered by the character. No
  shadow, floor, motion lines, effects, text, numbers, labels or watermark.
- PNG if possible.
```

---

## Then one message per request

Send these one at a time, starting each with the request line.

After the first one of each animation, the next views only need the request line (e.g. `WALK — LEFT`). Gemini remembers the frame list. If a later view goes wrong, paste the full message again with the new view.

### Core battle animations (do these first)

**Walk (4 frames)**
```
WALK — FRONT
4 frames:
1. Contact: left foot stepped forward, right foot back; right arm swings forward, left arm back.
2. Passing: legs together under the body, arms at the sides; the whole body 1 sprite pixel higher.
3. Contact: RIGHT foot stepped forward, left foot back; LEFT arm swings forward, right arm back.
4. Passing: legs together under the body, arms at the sides; the whole body 1 sprite pixel higher.
Frames 1 and 3 must step with DIFFERENT legs. The grip hand hangs down, weapon angle DOWN.
```

**Attack: swing (3 frames)**
```
ATTACK SWING — FRONT
3 frames:
1. Wind-up: grip raised high behind the head, weapon angle UP-BACK; weight on the back foot,
   body leaning back slightly.
2. Strike: stepping forward, the arm extended forward at shoulder height, weapon angle
   FORWARD; the body twisted into the swing.
3. Follow-through: the arm low in front, weapon angle DOWN-FORWARD, body leaning in, front
   knee bent.
```

**Hurt (1 frame)**
```
HURT — FRONT
1 frame: recoiling backward from a hit; head tilted back, one eye shut, teeth gritted; arms
pulled in toward the chest; weapon angle DOWN; feet still on the foot line.
```

**Knocked out (1 frame)**
```
KNOCKED OUT — FRONT
1 frame: lying flat on the ground on the back, eyes closed, arms loose at the sides, the
whole body along the bottom of the cell (it may lie diagonally to fit), fully inside the
cell. Grip hand relaxed and open.
```

### More battle animations

**Attack: thrust (2 frames)**
```
ATTACK THRUST — FRONT
2 frames:
1. Draw back: grip pulled back to the hip, weapon angle FORWARD, knees bent, weight back.
2. Lunge: the arm fully extended forward, weapon angle FORWARD, front foot stepped forward,
   body leaning in.
```

**Ready / guard (1 frame)**
```
READY — FRONT
1 frame: feet apart, knees slightly bent, grip held in front of the chest, weapon angle
UP-FORWARD, alert expression.
```

**Cast / use item (2 frames)**
```
CAST — FRONT
2 frames:
1. Both hands together in front of the chest, eyes closed, concentrating.
2. Both arms raised up and forward, both hands OPEN with palms out, eyes open.
```

**Kneel / low health (1 frame)**
```
KNEEL — FRONT
1 frame: down on one knee, the other foot flat; the grip hand resting on the ground beside
the knee, weapon angle DOWN; head lowered, tired. The knee and foot on the foot line.
```

**Jump (2 frames)**
```
JUMP — FRONT
2 frames:
1. Crouch: knees deeply bent, arms swung back, ready to jump.
2. In the air: feet tucked up, arms raised, the whole body 48 pixels above the usual foot
   line.
```

**Victory (2 frames)**
```
VICTORY — FRONT
2 frames:
1. Grip raised straight up above the head, weapon angle UP, big smile.
2. The same pose with a small hop, the whole body 16 pixels higher.
```

### Emotes and idle

**Talk (2 frames)**
```
TALK — FRONT
2 frames:
1. Standing, head tilted slightly up, mouth open.
2. Head nodded down by 1 sprite pixel, mouth closed.
```

**Surprised (1 frame)**
```
SURPRISED — FRONT
1 frame: leaning back, eyes wide, mouth open, both hands raised near the shoulders.
```

**Sad (1 frame)**
```
SAD — FRONT
1 frame: head down, shoulders slumped, arms hanging loosely, eyes looking down.
```

**Sit (1 frame)**
```
SIT — FRONT
1 frame: sitting on the ground, knees up, arms resting on the knees. The seat on the foot
line.
```

---

## Order and count

For each animation, do the views in this order: FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK.

| Animation | Frames | Images (5 views) |
| --- | --- | --- |
| Walk | 4 | 5 |
| Attack swing | 3 | 5 |
| Hurt | 1 | 5 |
| Knocked out | 1 | 5 |
| Thrust | 2 | 5 |
| Ready | 1 | 5 |
| Cast | 2 | 5 |
| Kneel | 1 | 5 |
| Jump | 2 | 5 |
| Victory | 2 | 5 |
| Talk | 2 | 5 |
| Surprised | 1 | 5 |
| Sad | 1 | 5 |
| Sit | 1 | 5 |

That's 70 images per character. The first four rows (20 images) are enough to start a battle.

Send me the images as you go: name them in the message, e.g. "walk front". I'll check each one and put it on the sheet.

## Fix-up lines (same chat)

- `Wrong direction. This is VIEW: <view>. <the view's description from the setup>.`
- `Redo frame N only. Keep the other frames exactly the same.`
- `Same character as the attached base image. Don't change the face, hair, clothes or size.`
- `No weapon. The right hand is an empty closed grip.`
- `Exact image size: <width> x 512, no margins or divider lines.`
- `The feet must touch the same line in every frame.`
- `Frames 1 and 3 must step with different legs.`

If Gemini starts drifting (the character changes, or it ignores the rules), start a fresh chat with Message 1 again. It's quicker than arguing with it.

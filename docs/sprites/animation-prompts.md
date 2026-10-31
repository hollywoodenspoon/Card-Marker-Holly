# Animation prompts (Gemini)

These prompts make the animation frames for the base characters (`art/sprites/base-male.png`, `base-female.png`). They follow how Final Fantasy Tactics does it:
- The character is drawn **without a weapon**, holding an **empty grip** (a closed fist with a gap for a handle).
- Weapons are separate sprites drawn at a few fixed angles. Each attack frame says which angle the weapon is at, so any weapon drawn later fits.

## How to use

- **One image = one animation in one view.** That's a single row of frames, so 5 images per animation (front, front-left ¾, left, back-left ¾, back). Small jobs keep Gemini consistent.
- Use a **fresh chat per character** and attach that base's turnaround (the Gemini original in `art/sprites/source/`). Stay in that chat for all of the character's animations.
- Fill in the `[ ]` parts from the animation list below. Send me each image and I'll put it on the sheet.

## The prompt

```
Using the attached character EXACTLY (same body, proportions, face, hair, grey undershirt and
shorts, colours, outline, pixel scale and high camera angle), create ONE row of animation
frames for an isometric tactics RPG, in the style of Final Fantasy Tactics and Ragnarok Online
sprites.

ANIMATION: [NAME]
VIEW: [VIEW] — the same direction in every frame of this row.
  (FRONT = facing the viewer; FRONT-LEFT 3/4 = facing toward the LEFT edge of the image and
  toward the viewer; LEFT SIDE = profile facing the LEFT edge; BACK-LEFT 3/4 = turned away,
  facing the upper-LEFT; BACK = facing away.)
FRAMES: [N], left to right in time order:
[FRAME LIST]

WEAPON HAND (important):
- The character holds NO weapon. Weapons are added later as separate sprites.
- The right hand is a closed grip, as if holding a sword handle: a fist with a small gap
  through it. Keep that grip in every frame, even when the arm moves.
- Pose the arm exactly as if a sword were held, at the angle given for each frame.

RULES:
- The exact same character and size in every frame. Only the pose changes.
- 8x scale: every sprite pixel is an exact 8x8 block of one flat colour. Crisp edges, no blur,
  no anti-aliasing, no gradients.
- Each frame sits in its own 512 x 512 cell. Image size: exactly [N x 512] x 512 pixels, no
  gaps, no margins, no divider lines.
- The feet stay on the same line in every cell, 32 pixels above the bottom edge (except
  jumps and falls, as described).
- The character stays horizontally centred in its cell and never crosses into another cell.
- Background: flat solid magenta #FF00FF only. No shadow, no floor, no motion lines, no
  effects, no text, no labels.
```

## The animations

The weapon angle is where an imaginary sword points: **up**, **up-forward**, **forward**, **down-forward**, **down**, **back** or **up-back**. "Forward" means the way the character faces.

| Animation | Frames | Frame list (paste into `[FRAME LIST]`) |
| --- | --- | --- |
| Walk | 4 | 1) contact: left foot forward, right arm forward; 2) passing: legs together, body 1 pixel higher; 3) contact: right foot forward, left arm forward; 4) passing: legs together, body 1 pixel higher. The grip hand swings gently, weapon angle: down. |
| Attack: swing | 3 | 1) wind-up: grip raised high behind the head, weapon angle up-back, weight on the back foot; 2) strike: arm extended forward at shoulder height, weapon angle forward, stepping in; 3) follow-through: arm low in front, weapon angle down-forward, body leaning in. |
| Attack: thrust | 2 | 1) draw back: grip pulled back to the hip, weapon angle forward, knees bent; 2) lunge: arm fully extended forward, weapon angle forward, front foot stepped forward. |
| Ready / guard | 1 | Feet apart, knees slightly bent, grip held in front of the chest, weapon angle up-forward. |
| Cast / use item | 2 | 1) both hands together in front of the chest, eyes closed; 2) both arms raised up and forward, palms open (the grip hand opens). |
| Hurt | 1 | Recoiling backward from a hit, one eye shut, arms pulled in, weapon angle down. |
| Kneel (low health) | 1 | Down on one knee, the grip hand resting on the ground, head lowered, weapon angle down. |
| Knocked out | 1 | Lying flat on the ground on the back, eyes closed, inside the cell, the body along the bottom of the cell. |
| Jump | 2 | 1) crouch: knees bent, arms back; 2) in the air: feet tucked up, body 6 pixels above the usual foot line, arms up. |
| Victory | 2 | 1) grip raised straight up, weapon angle up; 2) the same with a small hop, body 2 pixels higher. |
| Emote: talk | 2 | 1) standing, head slightly up, mouth open; 2) head nodded down 1 pixel, mouth closed. |
| Emote: surprised | 1 | Leaning back, eyes wide, hands up near the shoulders. |
| Emote: sad | 1 | Head down, shoulders slumped, arms hanging. |
| Sit | 1 | Sitting on the ground, knees up, arms resting on the knees. |

**Order:** walk → attack swing → hurt → knocked out first (the core of a tactics battle), then the rest.

## Fix-up lines (same chat)

- `Keep the exact same image size: W x 512, no margins.`
- `Redo frame N only. Keep the others exactly the same.`
- `Same character and size as the attached image. Do not change the face, hair or clothes.`
- `No weapon. The right hand is an empty closed grip.`
- `The feet must stay on the same line in every frame.`
- `Face the LEFT edge of the image in every frame.`

## Weapons (later)

Each weapon is drawn once at the 7 angles above (up, up-forward, forward, down-forward, down, back, up-back), with its handle on a marked grip pixel. The sprite JSON lists the hand point and the weapon angle for every frame, so the Engine puts the right weapon picture in the hand.

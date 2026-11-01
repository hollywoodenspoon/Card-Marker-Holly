# Sprites

- `base-mannequin.*` is the main base: PixelLab's bald mannequin (Ragnarok Online-style body). Frames are 96 × 96 (the 64 × 64 character with 16 px of room on every side), feet on row 79, 8 drawn directions (S, SE, E, NE, N, NW, W, SW). Nothing is mirrored.
  - `.png`: the sheet;
  - `.aseprite`: Body and Hand points layers, one tag per pose/animation and direction;
  - `.json`: what the Engine reads.

  Poses and animations:

  | Key | What |
  | --- | --- |
  | `stand` | standing + breathing |
  | `walk` | 6 frames |
  | `ready` | fists up |
  | `slash` | 9 frames |
  | `kneel` | low health |
  | `down-up` | knocked out, face up |
  | `down-face` | knocked out, face down |
  | `pose-slash`, `pose-stab`, `pose-jump`, `pose-dodge` | starting poses |
- `base-neutral.*`: the earlier PixelLab test (grey clothes): stand, walk, ready.
- `source/`: PixelLab's exports, unchanged.
- `parts/`: one strip per pose or animation, which `scripts/sprites/build.py` puts together.
- `old/`: the earlier Gemini bases, kept for reference.

Rebuild after a new PixelLab export (unzip it into `source/pixellab-mannequin/` first):

```bash
python3 scripts/sprites/import_pixellab.py art/sprites/source/pixellab-mannequin base-mannequin
python3 scripts/sprites/build.py base-mannequin
```

The importer skips animations that are missing a direction and says which ones. It also removes white slash streaks (white areas touching the background).

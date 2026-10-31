# Sprites

- `base-neutral.*` is the current base character, from PixelLab: 96 × 96 frames (the 64 × 64 PixelLab character with 16 px of room on every side), 8 drawn directions (S, SE, E, NE, N, NW, W, SW). Nothing is mirrored.
  - `.png`: the sheet;
  - `.aseprite`: Body and Hand points layers, one tag per animation and direction;
  - `.json`: what the Engine reads.
- `source/pixellab-neutral/`: PixelLab's export, unchanged.
- `parts/`: one strip per animation, which `scripts/sprites/build.py` puts together.
- `old/`: the earlier Gemini bases (male and female, 5 views mirrored), kept for reference.

Rebuild:

```bash
python3 scripts/sprites/import_pixellab.py art/sprites/source/pixellab-neutral base-neutral
python3 scripts/sprites/build.py base-neutral
```

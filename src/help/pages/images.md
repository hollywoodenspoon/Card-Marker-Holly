# Images and art boxes

There are two kinds of pictures on a card. An **image** is a fixed picture, such as a frame or a logo, that looks the same on every card using the template. An **art box** (image field) is a frame that each card fills with its own picture.

## Adding pictures

- **Add** → **Image…** opens the file picker and places the picture on the card.
- Drag picture files from your computer onto the canvas. Dropped on an art box, the picture fills that box; anywhere else, it becomes a new image where you dropped it.
- Paste a copied picture with [[Ctrl+V]] (⌘ on Mac).
- Click an image in **Assets** to place it. If an art box is selected, the picture goes into the box instead. See [Assets and folders](help:assets).

PNG, JPG, WebP and SVG files work.

## Moving, resizing and rotating

- Drag a picture to move it. Arrow keys nudge it by 0.5 mm, or 5 mm with [[Shift]].
- Drag a corner handle to resize. Pictures keep their shape; hold [[Shift]] while dragging to stretch freely.
- Drag the round handle above the box to rotate. It snaps to 45° steps when you get close. To type an exact angle, use **Rotation** in the **Layout** section of the properties panel.

The **Layout** section also has exact **X**, **Y**, **Width** and **Height**, **Flip horizontally** and **Flip vertically**, **Opacity**, and **Arrange** buttons (bring to front, forward, backward, send to back). Lock a picture in the Layers list so it can't be moved by accident.

## Cropping and replacing

1. Select the image and press **Crop** in the **Image** section (or double-click the image).
2. Drag the picture to move it inside the box, and drag the handles to change what is shown.
3. Press **Done** (or [[Esc]]).

**Reset crop** shows the whole picture again. **Replace** swaps in a new picture but keeps the position and size; the new picture is cropped to fit, so it is never squashed.

![Image properties: crop, replace and layout](image-props.webp)

## Art boxes

Add one with **Add** → **Image field (art box)**. A new project's starter front already has one called "Art".

**In the template**, the **Default art** section sets the picture cards show until they get their own, and **Fit** chooses **Fill frame** (the picture covers the whole box, edges may be cut off) or **Fit inside** (the whole picture shows, with space around it).

**On a card**, select the art box. A bar floats under the card:

- **Choose image** / **Replace image** picks this card's picture. Double-clicking an empty art box does the same. Once it has a picture, **Replace** is in the properties panel too.
- **Reposition** lets you drag the picture inside the frame. The **Zoom** slider in the **Art for this card** section enlarges it (100 to 400%). **Reset framing** undoes both.
- **Default** goes back to the template's default art.

![An art box with the floating bar](art-box.webp)

> **Tip:** Select an art box, then click a picture in Assets to drop it straight in. On a phone, tap the box, open **Assets** in the bottom bar and tap a picture.

## Print quality and SVG

The app checks how sharp each picture will print at its placed size. Below about 300 DPI, an orange **!** appears on the picture, and the **Image** section says something like "Prints at about 180 DPI". Use a bigger picture, or make the box smaller.

SVG pictures have no pixels, so they stay sharp at any size and stay vector in the PDF.

If a picture's file is missing, the section says so; press **Replace** to fix it.

## See also

- [Assets and folders](help:assets)
- [Layers, groups and alignment](help:layers)
- [Templates and fields](help:templates)
- [Canvas: zoom, pan, snapping and undo](help:canvas)

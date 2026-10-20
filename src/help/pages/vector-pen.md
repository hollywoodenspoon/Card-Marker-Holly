# The pen tool

The pen draws your own shapes out of points (anchors) joined by straight lines or curves. It works like the pen in Adobe Illustrator, so if you know that, you already know this.

## Picking the pen

Press the **Pen** button in the tools, or [[P]]. A hint at the top of the right pane says what a click will do right now.

## Reading the pen cursor

The small mark next to the pen nib tells you what a click will do:

- **✱** (star): start a new path.
- **No mark**: place the next point.
- **○** (circle): close the path.
- **^**: change the point you just placed, or (with [[Alt]]) switch a point between corner and smooth.
- **/** (slash): carry on drawing an open path from its end.
- **–○**: join to the end of another open path.
- **+** / **−**: add or delete a point on the selected path.

## Straight lines and corners

1. Click where the shape starts.
2. Click again for each corner. Each click adds a straight line from the last point.
3. Hold [[Shift]] while clicking to keep the line at 0°, 45° or 90°.

A line follows the pointer from the last point, so you can see the next segment before you click.

## Curves

Instead of clicking, press and drag. The point is placed where you pressed, and dragging pulls out two handles that bend the line on both sides. Drag further for a rounder curve; drag in another direction to change its angle. [[Shift]] keeps the handles at 45° steps.

### A sharp turn between two curves

Hold [[Alt]] (Option on Mac) while you drag. Only the handle in front of the point moves, so the curve can turn sharply there. You can press [[Alt]] partway through the drag.

### Changing the point you just placed

Move back over the last point (the cursor shows **^**):

- **Click** it to remove its forward handle, so the next segment starts straight, like a corner.
- **Drag** from it to pull out a new forward handle on its own.

### Moving a point while placing it

While still holding the mouse button, hold [[Space]] and move: the point itself moves. Let go of [[Space]] to go back to shaping the handles.

## Closing a path

Move over the first point (the cursor shows **○**) and click. Drag instead to shape the curve of the closing segment. The path is then finished.

## Finishing an open path

Lines and swirls don't need closing. To stop drawing:

- Press [[Enter]] or [[Esc]].
- Or hold [[Ctrl]] (⌘ on Mac) and click empty space.

On Android, the Back button also finishes the path. A path with only one point is removed.

## Fixing mistakes while you draw

- [[Backspace]] (or [[Delete]]) removes the last point. Keep pressing to remove more.
- [[Ctrl]] (⌘ on Mac) held down turns the pen into **Direct selection** for a moment: drag any point or handle, then let go and carry on drawing.
- [[Ctrl+Z]] undoes step by step.

## Carrying on and joining paths

- With no path being drawn, move over the end of any open path (cursor **/**) and click. You carry on drawing from that end.
- While drawing, move over the end of another open path (cursor **–○**) and click. The two become one path and drawing stops.

## Adding, deleting and converting points

With the pen, on a **selected** path (when you are not drawing):

- Over its outline the cursor shows **+**: click to add a point.
- Over one of its points the cursor shows **−**: click to delete it.
- Hold [[Alt]] over one of its points (cursor **^**): click to switch it between corner and smooth.

There are also tools just for this:

- **Add anchor point** ([[+]]): click any path's outline.
- **Delete anchor point** ([[-]]): click a point.
- **Anchor point (convert)** ([[Shift+C]]): click a point to switch it between smooth and corner, drag from it to pull out new matching handles, or drag one handle to move it on its own.

## Editing points afterwards

Use **Direct selection** ([[A]]):

- Click a point to select it; [[Shift]]-click to pick more. Drag a box to pick all points inside it. Drag to move them.
- Drag a handle to reshape the curve. On a smooth point the opposite handle follows to keep the curve smooth; hold [[Alt]] to move one handle on its own.
- With one point selected, **Point X** and **Point Y** in the right pane place it exactly.

New pen paths have a dark 3 px stroke and no fill. Change that in the right pane (see [Colour, stroke and size](help:vector-basics#colour-stroke-and-size)).

## On a touch screen

Tap for corners and drag for curves. There is no [[Alt]] key, so tick **Break handles (like holding Alt)** in the right pane under **Snapping** when you need it. Instead of [[Ctrl]], switch to **Direct selection**. The hint at the top of the right pane says what a tap will do.

## See also

- [Drawing shapes](help:vector-basics)
- [Combining shapes](help:vector-combine)
- [Saving drawings](help:vector-save)

# Combining shapes

Lots of good icons are simple shapes put together: a circle with a bite cut out, a shield with a star punched through. In the Vector Maker you can merge, cut and split shapes in one click, like Illustrator's Pathfinder.

## Selecting the shapes

Select two or more shapes with **Selection** ([[V]]): [[Shift]]-click each one, drag a box over them, or press [[Ctrl+A]] (⌘ on Mac) for everything. The **Combine shapes** section then appears in the right pane (on a phone or tablet, press **Properties** in the top bar).

What counts as "front" and "back" is the stacking order: a shape higher in Layers, or brought forward, is in front.

## The five buttons

- **Unite (merge)**: all the shapes become one outline. It takes the colours of the frontmost shape.
- **Minus front (cut)**: the shapes in front are cut out of the shape at the back. The back shape keeps its colours. This is how you punch holes.
- **Intersect**: only the area where all the shapes overlap is kept, in the frontmost shape's colours.
- **Exclude**: keeps the areas where the shapes don't overlap and removes the overlaps, in the frontmost shape's colours.
- **Divide**: cuts everything into separate pieces wherever the outlines cross. Each piece keeps the colours of the shape that was on top of it, and is named "… piece". Use it to colour parts of a design separately, or delete the bits you don't want.

The result replaces the original shapes, stays where the back shape was, and is selected so you can carry on.

> **Note:** If the shapes don't overlap, **Intersect** leaves nothing. Press [[Ctrl+Z]] to get them back. Every combine is one undo step.

## Compound paths

The **Path** section has two more buttons:

- **Compound path** (two or more selected): makes the shapes one object without changing their outlines. Where they overlap, you get a hole. It takes the frontmost shape's colours. Use it for a ring, a letter with a hole, or a stencil.
- **Release compound**: splits a shape with several outlines into separate shapes, one per outline. Traced images and results of **Divide** or **Exclude** often have several outlines.

**Reverse direction** flips the order of a path's points. It only matters in rare cases, such as where a line's ends sit.

## Example: a moon icon

1. Draw a circle with **Shapes** → **Ellipse**, holding [[Shift]].
2. Draw a second, slightly smaller circle overlapping its right side.
3. Select both and press **Minus front (cut)**. A crescent is left.

## Example: a sword over a shield

1. Draw a **Shield** and a **Sword** from **Shapes**.
2. Put the sword in front and select both.
3. **Unite (merge)** gives one solid silhouette; **Divide** gives separate pieces you can colour on their own.

> **Tip:** Combining works on filled outlines. Give your shapes a fill first. Lines with only a stroke don't cut cleanly.

## See also

- [Drawing shapes](help:vector-basics)
- [The pen tool](help:vector-pen)
- [Tracing an image](help:vector-trace)

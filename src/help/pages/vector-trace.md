# Tracing an image

**Trace image** turns a picture into editable vector shapes, one per colour. Use it to sharpen a hand-drawn symbol, rebuild a logo, or turn a scanned sketch into clean line art you can edit with the pen.

## Opening Trace image

In the Vector Maker, press **Trace image** in the top bar. On a phone, it is in the **⋯** menu at the top right.

## Choosing a picture

- **Picture** lists the images you have uploaded to this project (not SVGs, which are already vector).
- **From a file…** traces a picture from your computer or phone without adding it to your assets.

![The Trace image window with its preview](trace.webp)

## The settings

The preview updates a moment after each change, and shows how many shapes it will make.

- **Colours** (2 to 16, default 6): how many colours the picture is reduced to. Each colour becomes separate shapes. Fewer colours give fewer, cleaner shapes.
- **Detail** (1 to 10, default 6): how closely the outlines follow the picture. Higher keeps small bumps; lower gives smoother, simpler outlines.
- **Smoothing** (0 to 5, default 1): softens jagged edges and corners.
- **Remove specks** (0 to 64, default 8): drops tiny shapes, such as dust or noise in a scan. Raise it when the result is full of crumbs.
- **Ignore background** (on by default): leaves out the background colour. The background is the colour of the picture's top-left corner. A picture that is transparent there has no background to leave out.

## Adding the result

Press **Trace**. The shapes go on a new layer named "Traced …", scaled to fit the artboard and centred. They are all selected, and the tool switches to **Selection**, so you can move or resize them straight away.

Then tidy up like any other drawing:

- Click a shape to change its **Fill**, or delete the shapes you don't need.
- Select several shapes of one colour and press **Unite (merge)** to make them one.
- Use **Direct selection** or the pen to fix outlines.

## What traces well

- **Best**: logos, icons, symbols, line art, pixel art, flat colours, scans of ink drawings on white paper.
- **Harder**: photos and painted art become many small shapes. Lower **Colours**, raise **Smoothing** and **Remove specks**, and expect to clean up.

> **Tip:** For a scanned ink drawing, set **Colours** to 2 and keep **Ignore background** on. You get only the ink, ready to recolour.

> **Tip:** Set the artboard size before tracing if you want a particular shape, for example a square symbol. The traced picture fits inside the artboard and keeps its proportions.

## See also

- [Drawing shapes](help:vector-basics)
- [Combining shapes](help:vector-combine)
- [Saving drawings](help:vector-save)
- [Images and art boxes](help:images)

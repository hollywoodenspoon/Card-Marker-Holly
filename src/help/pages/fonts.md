# Fonts

You can use the fonts that come with the app, or upload your own TTF and OTF files. Uploaded fonts are saved with the project, so they are still there after a reload, in backups and on other devices.

## Built-in fonts

Open ☰ → **Settings** → **Fonts…** (or **Settings…** and the **Fonts** tab). The **Built in** list shows:

- **Inter**, **Alegreya** and **Alegreya SC**: these come with the app and always print sharp.
- **Georgia**, **Arial**, **Times New Roman** and **Courier New**: common fonts from your device. How they look depends on the device.

![Fonts in Settings](fonts.webp)

## Uploading your own

1. Open ☰ → **Settings** → **Fonts…** and press **Upload fonts**.
2. Pick one or more `.ttf` or `.otf` files.
3. They appear under **Your fonts**, each shown in its own font, with the file name and weight.

The app reads the font's real family name from the file, so "Cinzel-Bold.ttf" and "Cinzel-Regular.ttf" both join the family "Cinzel". If a file isn't a working font, a message says it could not be loaded.

## Bold and italic

Upload every style of a family you want to use: Regular, Bold, Italic, Bold Italic. Then **Bold** and **Italic** in the text toolbar use the real designs.

If a style is missing, the app imitates it by thickening or slanting the regular letters, as browsers do. That works, but the real files look better.

## Using a font

- For a whole text: select it and choose **Font** in the **Default style** section of the properties panel.
- For some words: edit the text, select the words and choose a font in the toolbar.
- For many texts at once: use a [style preset](help:style-presets).
- For keywords: choose a font for the keyword in the Keywords dialog.

The font list shows each name in its own font. If a text uses a font that is no longer in the project, the list shows it as "(missing)".

## Fonts in the PDF

Text in the bundled fonts and your uploaded fonts is turned into exact vector shapes in the PDF, so it looks the same as on screen and stays sharp at any size. The printer doesn't need the font installed.

Text in Georgia, Arial, Times New Roman or Courier New has no font file the app can use, so it is printed as a very fine picture (600 dpi) instead. It still prints well, but for crisp vector text, use a bundled or uploaded font.

> **Tip:** Want a system font in your design? Find its TTF or OTF file and upload it. Then it prints as vector text and looks the same on every device.

## Deleting a font

Press the bin button next to a font under **Your fonts**. The app asks first, because this can't be undone. Texts that used the font switch to the default font.

## See also

- [Text](help:text)
- [Style presets](help:style-presets)
- [Printing on paper](help:printing)
- [Troubleshooting and questions](help:troubleshooting)

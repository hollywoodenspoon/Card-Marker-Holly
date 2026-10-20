# Icon rows and grey icons

An icon row shows one icon repeated a number of times, like three hearts for health or two swords for attack. The template chooses the icon and the layout; each card chooses how many.

## Adding an icon row

1. Switch to **Template** mode (top bar).
2. Press **Add** → **Icon row (stat)**. A row named "Stat" appears with 3 icons.
3. Rename it in the properties panel (e.g. "Health"). The name is also its field name, so the count carries over if a card switches to another template with the same field.

## Choosing the icon

- With the icon row selected, press the button under **Icon** in the **Icon row** section (it says **Choose icon**, or shows the current icon) and pick one of your images, or press **Upload icon**.
- Or select the row and click an image in **Assets**.
- An icon row with no icon yet shows a **Choose icon** button in the bar under the card. Double-clicking it does the same.

Transparent PNGs or SVGs work best. The icon keeps its own shape inside a square of **Icon size**.

## Setting the count on a card

In **Card** mode, select the icon row. A bar floats under the card with **−** and **+** for the count, so you can set stats quickly card after card. The **Icon row** section of the properties panel has the same control (**Count for this card**), where you can also type a number.

The count in template mode is the **Default count**, used by every card that hasn't set its own. **Use template counts** (or **Default** in the floating bar) puts a card back to the default.

![An icon row with the count bar](icon-row.webp)

## Grey icons

Grey icons are extra copies of the icon in greyscale, shown next to the coloured ones. Use them to show a stat out of a maximum, for example 3 coloured and 2 grey for "3 of 5".

- On a card: use **−** **Grey** **+** in the floating bar, or **Grey icons on this card** in the properties panel.
- In the template: set **Default grey icons**, and choose where they go with **Grey icons go**: **On the left** or **On the right** for a row, **At the top** or **At the bottom** for a column.

Grey icons print in greyscale too.

## Layout settings

These are set in the template and shared by all its cards:

- **Direction**: **Row** (side by side) or **Column** (stacked).
- **Icon size** and **Gap**, in mm.
- **Shrink to fit the box**: when there are too many icons for the box, icons and gaps shrink together so they all fit. With it off, they keep their size and may run past the box.

Icons are always centred in the box, so the row stays centred whatever the count. Make the box as wide as the largest count you need.

> **Tip:** In a mail merge, an icon-row column holds plain numbers, e.g. `4`. See [Mail merge from a spreadsheet](help:mail-merge).

## See also

- [Templates and fields](help:templates)
- [Assets and folders](help:assets)
- [Card data table and CSV](help:card-data)
- [Mail merge from a spreadsheet](help:mail-merge)

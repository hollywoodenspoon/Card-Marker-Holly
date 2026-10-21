# Mail merge from a spreadsheet

Mail merge turns each row of a spreadsheet into a card. Keep your card list (names, rules text, stats, art file names) in Excel or Google Sheets, then build or update all the cards in one go.

## Before you start

1. **Make your templates.** Each text, art box and icon row on a template is a field. See [Templates and fields](help:templates).
2. **Upload your art.** Art is matched by file name, so the pictures must already be in your assets.
3. **Lay out the spreadsheet** with one card per row and one thing per column, for example:
   - A: Name
   - B: Title
   - C: Rules text
   - D: Art (a file name such as `dragon.png`)
   - E: Power (a number, for an icon row)

A header row at the top is fine; you skip it when you merge.

## Telling fields which column to read

Each field reads one spreadsheet column, given by its letter. You can set the letters in two places:

- In **Template** mode, select a field on the template and type the letter in **Spreadsheet column** (right pane, **Template part** section). Layers then shows the letter next to the part.
- In the merge itself, under **Fields** (step 3 below).

The letters are saved on the template, so the next merge remembers them.

## Running a merge

Open it from **Cards** → the arrow next to **+ Card** → **Mail merge from spreadsheet…**, or open the card data view (**Data** in the rail, or on a phone ☰ → **Card data (table, CSV, mail merge)**) and choose the **Import** tab.

![The mail merge form](mail-merge.webp)

1. **Spreadsheet**: press **Choose file** and pick an `.xlsx`, `.csv` or `.tsv` file. Or copy cells in Excel or Google Sheets, paste them into the box and press **Use pasted cells**. A workbook with several sheets lets you pick the sheet.
2. **Rows**: set **First row** (row 1 is the top row; use `2` to skip a header row). **Only rows** and **Skip rows** take lists and ranges like `2-20, 25`. Empty rows are always skipped.
3. **Templates and columns**: pick the **Front template** and **Back template** (or **No back**). Optionally give columns for **Card name**, **Copies** (print copies), **Front column** and **Back column**. Front and back columns hold a template name per row, so one sheet can make creatures and spells; empty cells use the templates you picked. Under **Fields**, check or type each field's letter. Each field shows what it expects (text, image file name or number) and the value from the first row. If your header row uses the field names, **Use header names** fills the letters for you.
4. **Merge**: choose a mode (below), read any warnings, then press **Run merge**.

The line next to **Run merge** says how many cards it will add and update before you run it.

## Update existing or Add as new

- **Update existing**: cards made from a row by an earlier merge are updated, but only the fields that have a column. Rows without a card become new cards. Nothing is deleted. Use this when you fix the spreadsheet and merge again.
- **Add as new**: every row becomes a new card. Existing cards are not touched.

Cards with no name column are called _Row 2_, _Row 3_ and so on.

## What goes in the cells

- **Text**: plain text. Formatting such as keywords and inline symbols like `{fire}` still works, because it is applied on the card.
- **Art**: the image's file name, with or without its extension, in any capitals (`Dragon` finds `dragon.png`).
- **Icon rows** and **Copies**: whole numbers.
- **An empty cell** leaves the field as the template default (or, when updating, as it was).

## Warnings

Problems are listed before you run, with the row number. For example: no image with that name, a number column holding words, or a template name that doesn't exist. Fix the sheet and choose the file again, or run anyway and the problem cells are left out.

> **Tip:** The whole merge is one undo step. Press **Undo** next to the _Done_ message to remove it all, or later [[Ctrl+Z]] (⌘ on Mac) back in the editor.

> **Tip:** Combine mail merge with **Show only when…** rules, for example to show a gold gem only when the Rarity column says _Rare_. See [Turning parts on and off](help:part-toggles).

## See also

- [Card data table and CSV](help:card-data)
- [Templates and fields](help:templates)
- [Assets and folders](help:assets)
- [Turning parts on and off](help:part-toggles)

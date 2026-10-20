# Card data table and CSV

The card data view shows every card as a row in a spreadsheet-style table: its name, templates, print copies and every field value. You can edit right there, and save it all as a CSV file for Excel, Google Sheets or Numbers.

## Opening the table

On desktop, press **Data** in the rail on the left. On any device, open the ☰ menu and choose **Card data (table, CSV, mail merge)**.

It opens full screen with two tabs: **Table** and **Import**. To go back to the editor, press the back arrow at the top left, or [[Esc]].

![The card data table](data-table.webp)

## Reading the table

There is one row per card, in the same order as the Cards list. The columns are:

- **Name**, with a small picture of the card. This column stays on the left while you scroll sideways.
- **Front template** and **Back template**.
- **Copies**: how many times the card is printed from the print list.
- One column per field of the templates these cards use (front fields first).

Next to each heading is a small letter, such as `B` or `F`. That is the spreadsheet column the field is saved to in a CSV. It matches the letters used by mail merge.

At the top you can **Search** by card name and, if you have decks, pick a deck to show only its cards. The count next to them says how many cards are shown.

## Editing in the table

Changes go onto the cards as soon as you make them.

- **Name**: type a new name and press [[Enter]].
- **Front template** / **Back template**: pick another template. The card keeps any values whose field names match (see [Templates and fields](help:templates)).
- **Copies**: a number from 0 to 99.
- **Text fields**: type plain text. Grey text in an empty cell is the template's default, shown when the card has no text of its own.
- **Art boxes**: pick one of your uploaded images. **Default: …** means the card shows the template's picture.
- **Icon rows**: type a number.
- **✕** clears the card's own value, so the template default shows again.
- **—** in a shaded cell means that card's templates don't have this field.
- Click a card's picture to open that card in the editor.

Text that has its own formatting on the card (a bold word, a different colour) appears grey and in italics, and can't be changed here. Edit it on the card instead, so the formatting isn't lost.

> **Note:** Keyboard shortcuts like [[Ctrl+Z]] (⌘ on Mac) don't act while the table is open. To undo a change, go back to the editor and press undo there.

## Exporting a CSV

Press **Export CSV**. It saves the rows you can see (after search and deck filter) as _Project name cards.csv_ (with your project's name).

- The first row holds the column headings.
- Art boxes are written as image file names, and icon rows as numbers.
- Each value sits in the column shown by its letter in the table.
- An empty cell means "use the template default".

This is exactly the format mail merge reads, so a CSV can go out to a spreadsheet and come back in.

## Bringing an edited CSV back

1. Open the **Import** tab.
2. **Choose file** and pick your CSV.
3. Set **First row** to `2` (row 1 is the headings), and type the letters for **Card name**, **Copies**, **Front column** and **Back column** as shown in the table's headings.
4. Choose **Add as new**, then **Run merge**.

> **Note:** **Update existing** matches cards by the spreadsheet row they were first made from. Use it only when you re-run the same spreadsheet you first merged from, not for a CSV exported from this table.

The full import steps are on [Mail merge from a spreadsheet](help:mail-merge).

## See also

- [Mail merge from a spreadsheet](help:mail-merge)
- [Cards list and editing many cards](help:cards)
- [Templates and fields](help:templates)
- [Find and replace](help:find-replace)

# Keywords, card numbers and symbols

Three things change text automatically when a card is shown or printed: keywords get their own style, number codes become the card's number, and `{name}` codes become small pictures. What you typed is kept as it is, so editing a card still shows your original words.

## Keywords

Keywords are words or phrases such as "Flying" or "Deal damage" that should look the same on every card.

1. Press **Keywords** in the left rail, or ☰ → **Keywords…** (on a phone, ☰ → **Keywords…**).
2. Press **Add keyword** and type the word or phrase.
3. Choose its look: **Bold**, **Italic**, **Underline**, a colour, and a font (**Same font** keeps the text's own font). A sample line shows the result.

Keywords match whole words only and ignore capitals, so "flying" and "FLYING" are both styled, but "Flyingfish" is not. A phrase still matches with extra spaces between its words. Formatting you gave a word by hand wins over the keyword style.

Delete a keyword with the bin button next to it.

![The Keywords dialog](keywords.webp)

## Turning keywords off for one text

Some texts, such as card names, shouldn't style keywords. Select the text, and in the properties panel turn off **Style keywords in this text**. The **Edit keywords…** button there opens the same Keywords dialog.

## Card numbers

Type these codes in any text:

- `{#}` is the card's number: its place in the **Cards** list.
- `{#:3}` is the number padded with zeros to 3 digits, e.g. 007. Any width from 1 to 99 works.
- `{total}` is the number of cards in the project.

The quickest way is **Add** → **Card number**. It adds a small text showing `{#}/{total}` (e.g. "3/60") in the bottom-right corner, with keywords turned off.

The first card is number 1. To start somewhere else, click an empty spot on the canvas so nothing is selected, then change **First card is number** under **Card numbers** in the properties panel.

> **Note:** The number follows the order of the Cards list, so dragging a card to a new place renumbers the cards. Print copies of the same card all show the same number. In template mode the text shows the first number as a preview.

## Inline symbols

Inline symbols let you write `{fire}` in rules text and get a fire icon, one line high, right in the sentence.

1. Upload the icon in **Assets** (an SVG stays sharp in print).
2. On the image, press ⋯ → **Symbol name…** and type a name, e.g. `fire`. Use letters, numbers, `-` and `_`.
3. Type `{fire}` in any text.

Images with a symbol name show it as a small tag on their tile in Assets. While editing text, the **Insert symbol** button ({ }) in the toolbar lists all your symbols, and the properties panel lists them under **Text**. Names ignore capitals. A name that matches no image stays as plain text, so a typo is easy to spot.

To stop using an image as a symbol, open **Symbol name…** again and clear the name.

## See also

- [Text](help:text)
- [Assets and folders](help:assets)
- [Cards list and editing many cards](help:cards)
- [Find and replace](help:find-replace)

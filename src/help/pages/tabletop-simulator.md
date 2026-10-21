# Tabletop Simulator

You can playtest your game in Tabletop Simulator before printing anything. Hearthside Cardworks saves your cards as deck sheets, the big grid images Tabletop Simulator uses for a custom deck.

## Exporting the deck

1. Open ☰ → **Export for Tabletop Simulator…**.
2. Under **Cards**, pick one of your decks, or **Print list (with its copies)** to use the cards and copies from the print view.
3. Check the summary, for example "60 cards · 1 sheet".
4. Press **Export**. The app saves a zip file named after your project (and the deck), ending in "Tabletop Simulator.zip".

The cards are always exported in full colour with all their art. The draft options in the print view only apply to paper.

![Export for Tabletop Simulator](tts.webp)

## What is in the zip

- **Face sheets** ("… faces 1.jpg", "… faces 2.jpg" …): your card fronts in a grid of 10 across and 7 down. Each sheet holds up to 69 cards, because the last spot (bottom right) holds the picture other players see when a card is hidden. Copies appear as separate cards, so a deck with 3 copies of a card shows it 3 times.
- **The back**:
  - If every card has exactly the same back, you get one back image, "… back.jpg".
  - If backs differ (different back templates, or anything changed on one card's back), you get a matching backs sheet for every face sheet, "… backs 1.jpg" and so on, in the same order.
- **How to import.txt**: step-by-step instructions with the right file names and numbers for this deck.

The sheets are no wider or taller than 4096 pixels, which Tabletop Simulator handles well. The cards are exported without bleed.

## Importing into Tabletop Simulator

Unzip the file first. Then, in Tabletop Simulator:

1. Open **Objects** → **Components** → **Custom** → **Deck**, and click on the table to place it. The Custom Deck window opens.
2. **Face**: choose "… faces 1.jpg".
3. **Back**: choose "… back.jpg". If you got backs sheets instead, choose "… backs 1.jpg" and tick **Unique backs**.
4. Set **Width** to 10 and **Height** to 7.
5. Set **Number** to the number of cards on that sheet: 69 for a full sheet, fewer for the last one. "How to import.txt" lists the total.
6. Tick **Back is hidden**.
7. Press **Import**.

With more than one face sheet, make one custom deck per sheet (faces 1 with backs 1, faces 2 with backs 2, and so on). Then stack the decks on the table to shuffle them together.

> **Tip:** For landscape cards, also tick **Sideways** in the Custom Deck window.

## Playing with others

Files on your computer work when you play alone. Other players can't see them. To play together, upload the images first (in Tabletop Simulator: **Modding** → **Cloud Manager**), or use links to images you host online.

## See also

- [Decks](help:decks)
- [Card images](help:card-images)
- [Printing on paper](help:printing)

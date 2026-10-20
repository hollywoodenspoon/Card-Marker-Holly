# Templates and fields

A template is a card layout: where the art, the title and the rules go, the colours and the fonts. Many cards share one template, and each card fills in its own values. Change the template, and every card using it changes straight away.

## Card mode and template mode

The **Card** / **Template** switch is in the top bar (on a phone, above the card).

- **Card** mode fills in one card: its title, art, stats and so on. The template's layout is fixed here.
- **Template** mode edits the layout shared by every card using that template. A bar above the card says "Editing template … · N cards". Press **Back to card** (**Done** on a phone) when you're finished.

You can also edit a template from the **Templates** tab (pencil button), or by selecting a template part on a card and pressing **Edit template** in the properties panel.

![Editing a template](template-mode.webp)

## Fields

A **field** is a template part whose content comes from each card:

- **Text** boxes: each card has its own words.
- **Art boxes** (image fields): each card has its own picture.
- **Icon rows**: each card has its own count.

Shapes and fixed images are the same on every card. Fields are marked "field" in the Layers list.

Each field has a **Field name** (in the **Template part** section of the properties panel). Cards store their values under that name. When a card switches to another template with a field of the same name, the value carries over. Values with no matching field stay saved on the card, so switching back brings them back.

Two parts on one template with the same field name show the same value. Renaming a field keeps the values on the cards.

What a field shows before a card fills it in is its default: the template's text, **Default art** or **Default count**.

## The template library

Open the **Templates** tab in the left rail (on a phone, ☰ → **Templates**). Templates are listed under **Fronts** and **Backs** with a thumbnail, and how many cards use each. A tick marks the ones the current card uses.

- Click a template to use it for the current card.
- The pencil edits it.
- **+** next to **Fronts** or **Backs** makes a new, empty template.
- ⋯ has **Use for this card**, **Rename**, **Duplicate**, **Export file** and **Delete**. Back templates also have **Use as back for all cards**.

![The Templates tab](templates.webp)

Deleting a template that cards use moves those cards to another template of the same side; their values are kept, and undo brings it all back.

> **Tip:** To make a variation, such as "Spell" from "Creature", **Duplicate** the template and change the copy.

## Saving a card as a template

**Save card as template** (at the top of the Templates tab) makes a new template from what the current side of this card shows: its template's parts, with the card's own text, art and counts as the new defaults, plus anything you added to this card only. Parts hidden on the card are hidden by default in the new template.

## Exporting and importing templates

- ⋯ → **Export file** saves a template as a `.cardtemplate.json` file, with its images, fonts, style presets and keywords.
- **Import** (at the top of the Templates tab) adds a template from such a file to this project. It takes this project's card size.

## Changing many cards

To move many cards to another template at once, use **Select** in the **Cards** tab. See [Cards list and editing many cards](help:cards).

## See also

- [Turning parts on and off](help:part-toggles)
- [Fronts and backs](help:fronts-backs)
- [Style presets](help:style-presets)
- [Mail merge from a spreadsheet](help:mail-merge)

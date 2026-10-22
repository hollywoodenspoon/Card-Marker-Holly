# Turning parts on and off

Not every card needs every part of its template. A spell may not need a health stat, and only rare cards get a gold gem. You can hide template parts on single cards, or let a rule decide.

When a part is hidden, it simply disappears. Other parts stay exactly where they are; nothing moves into the space.

## Hiding a part on one card

In **Card** mode:

- Press the eye next to the part in the **Layers** list (on a phone, **Layers** in the bottom bar), or
- select the part and turn off **Show on this card** in the **Template part** section of the properties panel.

Hidden parts are greyed out in Layers. Press the eye again to show the part. This only changes the current card.

![Hiding a template part on one card](part-toggles.webp)

These choices stay with the card when you edit the template later: moving, restyling or resizing a part doesn't undo them.

## Parts that are always shown

Some parts should never be hidden, like the background. In template mode, select the part and turn off **Can be hidden per card**. On cards, its eye is then faded and the properties panel says "This part is always shown."

In a new project, the background and the card title are set this way.

## Shown by default

In template mode, the eye in Layers (or **Shown by default** in the properties panel) sets whether a part is shown on cards that haven't chosen. Use this for an optional part most cards don't need: hide it by default, then turn it on for the few cards that do.

## Show only when…

A rule shows a part only on cards where a field has a certain value. For example: show the gold gem only when Rarity is Rare.

1. In template mode, select the part.
2. In the **Template part** section, press **Show only when…**.
3. Pick a field, a condition and a value. The conditions are **is**, **is not**, **contains**, **is filled in** and **is empty**.

Rules ignore capitals. A card that hasn't filled in the field uses the template's default value. Parts with a rule show an "if" badge in Layers. **Remove** deletes the rule.

The eye on a single card still wins over the rule, for the odd exception.

> **Tip:** Rules work well with a mail merge: put "Rare" in a spreadsheet column and the right cards get the gem by themselves. See [Mail merge from a spreadsheet](help:mail-merge).

## Many cards at once

In the **Cards** tab, press **Select** and tick the cards (or **All**). In the bar at the bottom, choose a part under **Template part**, then press the eye to show it or the crossed-out eye to hide it on all those cards. It is one undo step. See [Cards list and editing many cards](help:cards).

## New cards

**+ Card** makes a new card with the same templates and part toggles as the current one. To start with the template's defaults instead, use the arrow next to it → **New card with the template's defaults**.

## See also

- [Templates and fields](help:templates)
- [Layers, groups and alignment](help:layers)
- [Cards list and editing many cards](help:cards)
- [Mail merge from a spreadsheet](help:mail-merge)

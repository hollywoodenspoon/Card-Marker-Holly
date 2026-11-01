---
paths:
  - "src/templates/**"
  - "src/core/**"
---

## Template behavior

- A project has any number of templates (e.g. "Creature", "Spell", "Item"), for fronts and for backs.
- Each card picks one front template and one back template, and can switch at any time.
- When a card switches template, field values with matching field names carry over. Values with no matching field stay stored on the card, so switching back restores them.
- **Editing a template updates every card that uses it** (live).
- Per card, individual template parts can be turned on or off. When a part is hidden it simply disappears. **Other parts stay exactly where they are** (no auto-expand into freed space).
- Per-card toggles survive later template edits.
- Template library with thumbnails: rename, duplicate, delete, "save current card as template".
- Export and import templates as files.


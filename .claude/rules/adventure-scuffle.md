---
paths:
  - "src/adventure/**"
  - "src/urban/**"
  - "src/playtest-app/**"
  - "game/**"
---

# Game cards and rules (Adventure Scuffle, Urban Warfare)

- `game/<game>/` is the source of truth: `game/adventure-scuffle/` (`cards.csv`, `rulebook.md`, `balance/`), `game/urban-warfare/` (`rulebook.md`, `how-to-play.md`) and `game/battlelines/` (`rulebook.md`, the owner's original-mode text, kept word for word). `game/rulebook.md` combines both mode rulebooks unchanged (a test checks it).
- Any card, balance or rule change goes into those files **in the same PR**, never only as files sent to the owner. Send the owner the updated files as well.
- Card change: edit `cards.csv` (keep the import columns and the `{attack_as}`-style stat symbols) and add a dated line to the README changelog with the reason.
- Rule change: edit `rulebook.md`, bump its version, add a "Changes since" entry, and a changelog line.
- Balance run that leads to a change: save its report in `balance/` with the date.
- Every card in `cards.csv` must be readable by the rules engine (`src/adventure/effects/`); the read-all test checks it.
- Urban Warfare's engine is `src/urban/`; keep it matching `game/urban-warfare/rulebook.md`.

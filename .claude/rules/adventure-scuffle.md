---
paths:
  - "src/adventure/**"
  - "src/playtest-app/**"
  - "game/**"
---

# Adventure Scuffle cards and rules

- `game/adventure-scuffle/` is the source of truth: `cards.csv` (every card), `rulebook.md`, `balance/` reports.
- Any card, balance or rule change goes into those files **in the same PR**, never only as files sent to the owner. Send the owner the updated files as well.
- Card change: edit `cards.csv` (keep the import columns and the `{attack_as}`-style stat symbols) and add a dated line to the README changelog with the reason.
- Rule change: edit `rulebook.md`, bump its version, add a "Changes since" entry, and a changelog line.
- Balance run that leads to a change: save its report in `balance/` with the date.
- Every card in `cards.csv` must be readable by the rules engine (`src/adventure/effects/`); the read-all test checks it.

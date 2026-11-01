# Adventure Scuffle! — cards and rules

The single source of truth for the card game. Git keeps the history, so there are no versioned copies.

| File | What it is |
| --- | --- |
| `cards.csv` | Every card, at its current version, in the Hearthside Cardworks import columns: `Name_AS, Code_AS, Type_AS, FS_AS, A_AS, D_AS, Fate_AS, Ability_AS, Deck_AS, Archetype_AS`. Stats in ability text are written as symbols (`{attack_as}`, `{defense_as}`, `{fightingspirit_as}`) so the rules engine reads them. |
| `rulebook.md` | The Mutual Reveal rulebook. |
| `balance/` | Balance lab reports, one file per run that led to a change. |

**Codes** follow the set: TFQ The First Quest, TUF The United Front, TLC The Light of Courage, TAC The Arms of Creation, TEC The Entropy Cometh. Within a set, cards are numbered deck by deck in the set plan's order, then the bonus cards.

**Import:** in Cardworks, open the Data view → Import, and import `cards.csv` as new cards into a fresh project (importing into a project that already has these cards adds them again).

## Changelog

Newest first. Every card, balance or rule change gets a line here.

- **2026-11-01, Rulebook v2.6:** pairs is the Skirmish rule (2 cards at a time after the opening pairs); Classic and Triples retired.
- **2026-11-01, cards.csv:** first version in the repo: 188 cards. Built from the First Quest v3.2, Horde/Dread/Deepdelver/Anti-Incursion and Falconwatch/Cut Cards CSVs, with every change in `docs/design/adventure-scuffle-sets.md` applied (Adventuring errata TFQ-06/07/08/09/10/12, TFQ-44 Living Weapon Dusk, TFQ-45 Fear the First Shadow, Unmade Wretch's lock, The United Horde replacing The Banded Horde) and the seven drafted decks added. Set codes given to every card outside The First Quest; Wildcard Wanderer is TUF-34 (was BN-01) and Doppelganger Thief TLC-37.

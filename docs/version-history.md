# Version history

The version rule changed on 2026-10-29: only a major update bumps the middle
number; fixes, updates to features already built, and features still under
construction bump the last one (see `CLAUDE.md` and `DECISIONS.md`).

Earlier PRs were numbered under the old reading. Their real version numbers,
tags and releases stay as they were, so nothing breaks (pacman, the update
notice and old links all keep working). This table shows what each would have
been under the current rule. Versions keep counting up from the repo's current
one: the next PR is **0.8.1-beta**.

| PR | Title | Shipped as | Under the current rule | Released |
| --- | --- | --- | --- | --- |
| #49 | Show the version with the app's name | 0.1.1-alpha.1 | 0.1.1-alpha.1 | no |
| #50 | Bot ladder and MCTS (the new Hard) | 0.2.0-alpha.1 | 0.1.2-alpha.1 | no |
| #51 | Table overlays stay under the lab and other views | 0.2.1-alpha.1 | 0.1.3-alpha.1 | no |
| #52 | CMYK PDF export | 0.3.0-beta | 0.3.0-beta (major) | no |
| #53 | Later reveals touch revealed cards | 0.3.1-beta | 0.3.1-beta | no |
| #54 | Releases are the Arch package; Windows waits for Cozy | 0.3.2-beta | 0.3.2-beta | yes |
| #55 | Fix the black screen after rock-paper-scissors | 0.3.3-beta | 0.3.3-beta | yes |
| #56 | Combat stacks, rules fixes, Master Duel-style readability | 0.4.0-beta | 0.3.4-beta | yes |
| #57 | See every action in Hearthside Table | 0.5.0-beta | 0.3.5-beta | yes |
| #58 | Cozy Edition build | 0.6.0-beta | 0.3.6-beta | yes |
| #59 | Hearthside Engine: block map editor | 0.7.0-beta | 0.3.7-beta | no |
| #60 | Hearthside Engine: tile columns, tilesets, viewports | 0.8.0-beta | 0.3.8-beta | no |

Earlier PRs (#1–#48) used the 0.1.0 alpha line and are unchanged.

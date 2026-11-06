---
name: ship-pr
description: Finish a milestone or PR in Card Maker — commit, test the app yourself, bump the version and title the PR.
---

# Ship a PR

1. Commit to git after each milestone with a clear message.
2. Run the dev server and test the app yourself. For print features, generate a PDF and check sizes and positions.
3. Fix type errors and lint warnings; do not leave failing tests (`npm run typecheck`, `npm run lint`, `npm test`).
4. Bump the version in `package.json` (keep the beta label, since 0.3.0-beta):
   - Most PRs bump the last number (0.8.0-beta → 0.8.1-beta): fixes, updates to features already built, and features still under construction.
   - Only a major update bumps the middle one (→ 0.9.0-beta), and the owner decides what counts as major.
   - See DECISIONS.md.
5. If you added, moved or renamed files, update that folder's `CLAUDE.md` map.
6. Start the PR title with the version, e.g. "v0.3.1-beta: …".

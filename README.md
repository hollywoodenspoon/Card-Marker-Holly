# Card Maker

Browser-based card editor (React + TypeScript + Vite, Konva canvas). Everything is stored locally in IndexedDB; there is no backend.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check and build to dist/
npm test         # run unit tests (Vitest)
npm run lint     # ESLint
npm run preview  # serve the production build (installable, works offline)
```

Live version: https://hollywoodenspoon.github.io/Card-Marker-Holly/ — every push to `main` rebuilds it (`.github/workflows/pages.yml`). One-time setup: repo Settings → Pages → Source: **GitHub Actions**.

Assumptions and design choices are listed in [DECISIONS.md](DECISIONS.md).

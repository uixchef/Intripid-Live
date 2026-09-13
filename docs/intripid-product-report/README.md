# Intripid Product Report

A complete, factual, end-to-end product audit of the Intripid Live frontend.

## Contents

- `REPORT.md` — The main deliverable. A comprehensive product report covering all 32 parts of the audit.
- `screenshots/` — 55 screenshots captured at 1440×900 (desktop) and 390×844 (mobile).
- `contact-sheets/` — Placeholder for contact sheet montages (to be generated from screenshots).
- `journeys/` — Placeholder for journey-specific screenshot sequences.
- `capture-screens.mjs` — Playwright script that captures the primary screenshot set.
- `capture-screens-2.mjs` — Playwright script that captures the supplementary screenshot set.

## How to reproduce

1. Start the dev server: `npm run dev`
2. Install Playwright browsers: `npx playwright install chromium`
3. Run capture scripts:
   ```bash
   node docs/intripid-product-report/capture-screens.mjs
   node docs/intripid-product-report/capture-screens-2.mjs
   ```

## Key facts

- **Dev server URL:** `http://localhost:3000`
- **Branch:** `visual-refinement`
- **Commit:** `05391df`
- **Framework:** Next.js 16.3.4 (App Router, Turbopack)
- **State management:** Zustand 5 with persist
- **Map:** Mapbox GL JS 3.30.0
- **Drag/drop:** @dnd-kit/core 6.3.1
- **Animation:** Motion 13.2.0
- **Screenshots:** 55 total

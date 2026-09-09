# Intripid Live

Frontend foundation for Intripid, an interactive consumer travel product.

> **Status: scaffold only.** No product surfaces have been designed or built.
> The home page is a placeholder that verifies the toolchain.

## Requirements

- Node.js >= 20.9 (`.nvmrc` pins the version this was built with)
- npm

## Getting started

```bash
npm install
cp .env.example .env.local   # then paste your Mapbox token
npm run dev
```

The dev server runs at **http://localhost:3000**.

## Environment

| Variable                    | Required | Notes                                       |
| --------------------------- | -------- | ------------------------------------------- |
| `NEXT_PUBLIC_MAPBOX_TOKEN`  | for maps | Public Mapbox GL token, exposed to browsers |

- Real values go in **`.env.local`**, which is gitignored. `.env.example` is the
  tracked template.
- `NEXT_PUBLIC_*` values are inlined into the bundle **at build time**, so
  changing the token requires a rebuild, not just a restart.
- Never hardcode a token in source. Read it through `src/lib/env.ts`.
- `.env` files must sit at the repo root; they are silently ignored inside `src/`.

## Scripts

| Script              | Does                                                    |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Dev server on http://localhost:3000 (Turbopack)         |
| `npm run build`     | Production build                                        |
| `npm start`         | Serve the production build                              |
| `npm run typecheck` | `next typegen && tsc --noEmit`                          |
| `npm run lint`      | ESLint (flat config)                                    |
| `npm run lint:fix`  | ESLint with autofix                                     |
| `npm run clean`     | Remove build output                                     |

`npm run typecheck` runs `next typegen` first because route types and
`next-env.d.ts` are generated artifacts that a fresh clone or CI job will not
have.

## Stack

| Concern    | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)                  |
| UI         | React 19                                            |
| Language   | TypeScript (strict)                                 |
| Maps       | `mapbox-gl` 3                                       |
| Animation  | `motion` 13 — import from `motion/react`            |
| Drag & drop| `@dnd-kit/*`                                        |
| Dates      | `date-fns` 4                                        |
| State      | `zustand` 5                                         |
| Icons      | `lucide-react`                                      |
| Styling    | Plain CSS + CSS Modules                             |
| Linting    | ESLint 9 flat config, `eslint-config-next`          |

**No CSS framework is installed.** Tailwind and any design tokens were left out
deliberately — the visual direction for Intripid has not been decided.

## Structure

```
src/
  app/                  routes only — layout, page, error, not-found, robots, sitemap
  components/
    ui/                 generic primitives
    layout/             app shell
    foundation/         temporary scaffold smoke check — delete before real work
  features/             feature-scoped modules (components, hooks, store, types)
  hooks/                cross-feature hooks
  lib/
    env.ts              typed public env access
    mapbox/             Mapbox integration (see its README for the client boundary)
    utils/              small generic helpers
  stores/               cross-feature Zustand stores (factory + provider pattern)
  config/               static app constants
  styles/               shared stylesheets / future design tokens
  types/                shared and ambient types
```

Each directory has a `README.md` describing what belongs in it.

## Notes for contributors

Next.js 16 changed enough that older App Router habits will misfire. See
[`docs/nextjs-16-notes.md`](docs/nextjs-16-notes.md) before writing routes,
state, or map code.

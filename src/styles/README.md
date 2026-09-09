# styles/

Shared, non-global stylesheets and (eventually) design tokens.

Currently empty by design: no palette, typography or spacing scale has been
chosen for Intripid yet.

Rules:
- `src/app/globals.css` holds the reset and document defaults only, and is
  imported once, in the root layout.
- Component styles live in colocated `*.module.css` files.
- Global CSS is never unloaded on client-side navigation in Next.js 16, so
  third-party stylesheets are imported by the client module that needs them.
- Do not enable ESLint import sorting: CSS order depends on import order.
  Verify final CSS order with `npm run build`, not just in dev.

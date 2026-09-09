# Next.js 16 notes

Verified against the docs bundled with the installed version
(`node_modules/next/dist/docs`, Next 16.3.4). These are the things that differ
from Next 14/15 habits and will bite during the Intripid build.

## Async request APIs — fully removed, not deprecated

`params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` are
Promises only. Synchronous access no longer works at all.

```tsx
export default async function Page({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
}
```

Client Components cannot be async — read promises with React's `use()`.

## Route-aware type helpers are global

`PageProps<'/route'>`, `LayoutProps<'/route'>` and `RouteContext<'/route'>` are
generated (by `next dev`, `next build`, or `next typegen`) and available with no
import. Do not hand-write prop types.

## Error boundaries take `retry`, not `reset`

```tsx
{ error: Error & { digest?: string }, retry: () => void }
```

`retry()` re-fetches and re-renders the boundary's children; `reset()` only
clears error state. `error.tsx` does **not** catch errors from `layout.tsx` in
its own segment — only `global-error.tsx` catches root layout failures, and it
must render its own `<html>`/`<body>` and inherits no CSS.

## `middleware.ts` is now `proxy.ts`

Export `proxy`. Node.js runtime only — the edge runtime is not supported.
Place it at `src/proxy.ts`.

## Parallel routes need explicit `default.js`

Builds fail without one for every slot, including the implicit `children` slot.

## Turbopack is the default

For both `next dev` and `next build`. No `--turbopack` flag. **Adding a
`webpack` key to `next.config.ts` makes `next build` fail by design.**

Turbopack CSS gaps worth knowing: a `.module.css` cannot `composes` from or
`@import` a plain `.css` file (it becomes global). `@value`, `:import`/`:export`
and standalone `:local`/`:global` pseudo-classes are unsupported — use the
`:global(...)` function form.

Dev writes to `.next/dev`, builds to `.next`. A lockfile prevents two dev
servers; a second `next dev` looks like a hang.

## `next lint` is gone

`next build` no longer lints. Run `eslint` directly (already wired up in
`package.json`).

## Route segment config shrank

`dynamic`, `revalidate` and `fetchCache` still work today but are removed once
`cacheComponents` is enabled. `experimental_ppr` is gone entirely.

`cacheComponents` is **off** here, and the docs do not recommend it for new
projects. Write forward-compatible code anyway: explicit `<Suspense>` boundaries
near each async access, no segment-config exports, and no `new Date()`,
`Math.random()` or `crypto.randomUUID()` during render.

## Scroll behavior

Next 16 no longer overrides `scroll-behavior` during navigation. If
`scroll-behavior: smooth` is ever set on `<html>`, that element must also carry
`data-scroll-behavior="smooth"` or every route change animates a scroll.

## Environment variables

`NEXT_PUBLIC_*` inlining is a **textual** build-time substitution. These do
**not** work:

```ts
process.env[key]                          // dynamic lookup
const { NEXT_PUBLIC_X } = process.env     // destructuring
const env = process.env; env.NEXT_PUBLIC_X // aliasing
```

Only literal member access is replaced. There is no runtime mechanism for public
values in Next 16 (`publicRuntimeConfig` was removed); if one artifact must be
promoted across environments, serve the value from your own API instead.

There is no build-time validation of `NEXT_PUBLIC_*` — a missing token builds
cleanly and fails inside Mapbox at runtime, which is why `src/lib/env.ts`
provides `requireMapboxToken()`.

`PORT` cannot be set in `.env`; use `next dev -p <port>`.

## Browser-only libraries

`ssr: false` in `next/dynamic` only works inside a Client Component. Calling it
from a Server Component is a hard error, and a Server Component's dynamic import
of a Client Component does not code-split. Hence the two-file boundary described
in `src/lib/mapbox/README.md`.

The docs' `single-page-applications.md` example shows `dynamic(..., { ssr: false })`
in a file with no `"use client"` — that snippet is a trap. `lazy-loading.md` is
authoritative.

## Zustand and other client stores

Client Components render on the server too, so a module-level store instance is
shared across concurrent requests. Use a factory plus a provider mounted as deep
as possible. See `src/stores/README.md`.

## Package imports

`lucide-react` and `date-fns` are already in Next's default
`optimizePackageImports` list — do not add them. None of `mapbox-gl`, `motion`,
`@dnd-kit/*` or `zustand` need `transpilePackages`.

Import motion from `motion/react`. `framer-motion` is only a transitive
dependency here and should not be imported directly.

## Bundle analysis

`next build` no longer prints First Load JS. Use:

```bash
npx next experimental-analyze
```

## Editor

Run **TypeScript: Select TypeScript Version → Use Workspace Version** in VS Code,
otherwise the `next` TS plugin is inactive and will not flag `"use client"`
mistakes or client hooks used in Server Components. `.vscode/settings.json` sets
`typescript.tsdk` to make this the offered default.

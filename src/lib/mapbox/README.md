# lib/mapbox

Nothing is implemented here yet. This note records the integration shape the
map must use, which is a hard requirement of Next.js 16, not a preference.

## Required two-file client boundary

`mapbox-gl` touches `window` at import time and owns a DOM node, so it can
never be evaluated during a server render.

1. **Leaf module** — `"use client"`. Owns the container `ref`, creates the map
   in `useEffect`, and calls `map.remove()` in the cleanup. This file also
   imports the stylesheet:

   ```ts
   import "mapbox-gl/dist/mapbox-gl.css";
   ```

   Importing it here (rather than in `globals.css`) keeps it in the map's own
   chunk. Note that once loaded, global CSS is not unloaded on navigation, so
   the `.mapboxgl-*` rules persist for the session either way.

2. **Wrapper module** — also `"use client"`. Lazy-loads the leaf:

   ```ts
   const MapView = dynamic(() => import("./map-view"), {
     ssr: false,
     loading: () => <MapSkeleton />,
   });
   ```

   `ssr: false` only works inside a Client Component — calling it from a Server
   Component is a hard error. A Server Component's dynamic import of a Client
   Component also does not code-split, which is the second reason the
   `dynamic()` call must live in a client module.

The Server Component page imports only the wrapper.

## Token

Read it via `requireMapboxToken()` from `@/lib/env`. `NEXT_PUBLIC_*` values are
inlined textually at build time, so the token is frozen at `next build` and a
changed value needs a rebuild, not just a restart.

## Bundle

Mapbox GL is large. Confirm it lands in its own lazy chunk with:

```bash
npx next experimental-analyze
```

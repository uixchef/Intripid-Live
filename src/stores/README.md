# stores/

Cross-feature Zustand stores. Feature-local state belongs in
`src/features/<feature>/store.ts`.

## Use a factory, not a module-level singleton

Client Components render on the server too, so a module-scoped `create(...)`
store lives in the server process and is shared across concurrent requests.
Export a factory and instantiate it per render tree instead:

```ts
// store.ts
import { createStore } from "zustand/vanilla";

export type TripState = { /* ... */ };

export const createTripStore = () =>
  createStore<TripState>()((set) => ({ /* ... */ }));
```

```tsx
// trip-store-provider.tsx
"use client";

const TripStoreContext = createContext<ReturnType<typeof createTripStore> | null>(null);

export function TripStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createTripStore);
  return <TripStoreContext value={store}>{children}</TripStoreContext>;
}
```

Mount providers as deep in the tree as possible — not around `<html>` — so
Next.js can keep the static parts of the Server Component tree static.

# components/

Shared, reusable presentational components.

- `ui/` — generic primitives with no product knowledge (buttons, sheets, inputs).
- `layout/` — app shell pieces (header, nav, page containers).
- `foundation/` — temporary scaffold smoke check. Delete when the real build starts.

Feature-specific components belong in `src/features/<feature>/`, not here.

Add `"use client"` only at the entry point of an interactive subtree — everything
a client entry imports is pulled into the client bundle.

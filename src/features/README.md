# features/

Feature-scoped modules. Each feature owns its components, hooks, store slices
and types, and exposes a small public surface via an `index.ts`.

```
features/
  <feature>/
    components/
    hooks/
    store.ts
    types.ts
    index.ts
```

Routes in `src/app/` stay thin: they compose features, they do not implement them.

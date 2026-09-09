"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";

/**
 * Builds a React-scoped Zustand store: a provider that instantiates the store
 * once per tree, plus a typed selector hook.
 *
 * Why not a module-level `create()`: Client Components render on the server
 * too, so a module-scoped store instance would live in the server process and
 * be shared across concurrent requests. Instantiating inside a provider keeps
 * every render tree isolated.
 */
export function createStoreContext<T>(name: string) {
  const Context = createContext<StoreApi<T> | null>(null);

  function Provider({
    createStore,
    children,
  }: {
    createStore: () => StoreApi<T>;
    children: ReactNode;
  }) {
    // useState's initialiser runs exactly once per mounted tree.
    const [store] = useState(createStore);
    return <Context value={store}>{children}</Context>;
  }

  function useStoreSelector<S>(selector: (state: T) => S): S {
    const store = useContext(Context);
    if (!store) {
      throw new Error(`use${name} must be used inside <${name}Provider>`);
    }
    return useStore(store, selector);
  }

  function useStoreApi(): StoreApi<T> {
    const store = useContext(Context);
    if (!store) {
      throw new Error(`use${name}Api must be used inside <${name}Provider>`);
    }
    return store;
  }

  return { Provider, useStoreSelector, useStoreApi };
}

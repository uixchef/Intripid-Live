"use client";

import { useEffect, useState } from "react";

import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { Check, Circle, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { hasMapboxToken } from "@/lib/env";

/**
 * Temporary foundation smoke check.
 *
 * Its only job is to prove every installed dependency resolves, bundles and
 * runs under Next.js 16 / React 19 / Turbopack. It carries no product intent
 * and no design language — delete it once the real Intripid UI begins.
 */

/* -------------------------------------------------------------------------- */
/* zustand                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Store FACTORY rather than a module-level singleton: Client Components also
 * render on the server, so a module-scoped `create()` would be shared across
 * concurrent requests in the server process. Instantiating per component (or,
 * later, per provider) keeps each render isolated.
 */
function createCounterStore() {
  return createStore<{ count: number; increment: () => void }>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }));
}

/* -------------------------------------------------------------------------- */
/* dnd-kit                                                                     */
/* -------------------------------------------------------------------------- */

function Draggable({ offset }: { offset: { x: number; y: number } }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "foundation-draggable",
  });

  const dx = offset.x + (transform?.x ?? 0);
  const dy = offset.y + (transform?.y ?? 0);

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Translate.toString({ x: dx, y: dy, scaleX: 1, scaleY: 1 }),
        cursor: "grab",
        padding: "0.35rem 0.6rem",
        border: "1px solid",
        borderRadius: 4,
        background: "transparent",
        touchAction: "none",
      }}
      {...listeners}
      {...attributes}
    >
      drag me
    </button>
  );
}

/* -------------------------------------------------------------------------- */

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {ok ? <Check size={16} aria-hidden /> : <Circle size={16} aria-hidden />}
      <span>{label}</span>
    </li>
  );
}

export function StackCheck() {
  const [counterStore] = useState(createCounterStore);
  const count = useStore(counterStore, (s) => s.count);
  const increment = useStore(counterStore, (s) => s.increment);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mapboxVersion, setMapboxVersion] = useState<string | null>(null);

  // Load mapbox-gl only in the browser. It touches `window` at import time, so
  // it must never be pulled into a server render — this is the same isolation
  // the real map will need, in its smallest possible form.
  useEffect(() => {
    let active = true;

    void import("mapbox-gl").then((mod) => {
      if (active) {
        setMapboxVersion(mod.default.version ?? "loaded");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    setOffset((prev) => ({
      x: prev.x + event.delta.x,
      y: prev.y + event.delta.y,
    }));
  }

  // Fixed date on purpose: formatting `new Date()` during render would differ
  // between the server and client HTML and cause a hydration mismatch.
  const formattedDate = format(new Date(2026, 0, 15), "d MMM yyyy");

  // arrayMove is the reordering primitive the itinerary board will rely on.
  const reordered = arrayMove(["a", "b", "c"], 0, 2).join("");

  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "grid", gap: "1rem" }}
    >
      <ul style={{ display: "grid", gap: "0.35rem", listStyle: "none", padding: 0 }}>
        <Row ok label="motion — this section faded in" />
        <Row ok label="lucide-react — icons rendering" />
        <Row ok label={`date-fns — ${formattedDate}`} />
        <Row ok label={`@dnd-kit/sortable — arrayMove → ${reordered}`} />
        <Row ok={count > 0} label={`zustand — count ${count}`} />
        <Row
          ok={mapboxVersion !== null}
          label={
            mapboxVersion === null
              ? "mapbox-gl — loading…"
              : `mapbox-gl — v${mapboxVersion} loaded in browser`
          }
        />
        <Row
          ok={hasMapboxToken()}
          label={
            hasMapboxToken()
              ? "NEXT_PUBLIC_MAPBOX_TOKEN — set"
              : "NEXT_PUBLIC_MAPBOX_TOKEN — empty (add it to .env.local)"
          }
        />
      </ul>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          type="button"
          onClick={increment}
          style={{
            padding: "0.35rem 0.6rem",
            border: "1px solid",
            borderRadius: 4,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <MapPin size={14} aria-hidden style={{ display: "inline" }} /> count up
        </button>

        <DndContext onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
          <div
            style={{
              position: "relative",
              flex: 1,
              minHeight: "3rem",
              border: "1px dashed",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              padding: "0.5rem",
            }}
          >
            <Draggable offset={offset} />
          </div>
        </DndContext>
      </div>
    </motion.section>
  );
}

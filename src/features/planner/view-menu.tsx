"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronDown, List } from "lucide-react";

import { Popover } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { type PlannerView } from "@/stores/trip-store";

import styles from "./view-menu.module.css";

type GridView = "day" | "week" | "four" | "trip";

const GRID_VIEWS: { value: GridView; label: string; shortcut: string }[] = [
  { value: "day", label: "Day", shortcut: "D" },
  { value: "week", label: "Week", shortcut: "W" },
  { value: "four", label: "4 days", shortcut: "X" },
  { value: "trip", label: "Trip", shortcut: "T" },
];

function isGridView(view: PlannerView): view is GridView {
  return view === "day" || view === "week" || view === "four" || view === "trip";
}

export function ViewMenu({
  view,
  onChange,
}: {
  view: PlannerView;
  onChange: (view: PlannerView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [gridView, setGridView] = useState<GridView>(isGridView(view) ? view : "week");
  const current = GRID_VIEWS.find((item) => item.value === gridView) ?? GRID_VIEWS[1];
  const surface: "calendar" | "itinerary" = isGridView(view)
    ? "calendar"
    : "itinerary";

  useEffect(() => {
    if (isGridView(view)) setGridView(view);
  }, [view]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      const grid = GRID_VIEWS.find((item) => item.shortcut.toLowerCase() === key);
      if (grid) {
        event.preventDefault();
        onChange(grid.value);
        setOpen(false);
        return;
      }
      if (key === "a" || key === "i") {
        event.preventDefault();
        onChange("itinerary");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  function pickGrid(next: GridView) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={styles.cluster}>
      <button
        ref={setAnchor}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Schedular view, ${current.label}`}
        onClick={() => setOpen((value) => !value)}
      >
        {current.label}
        <ChevronDown size={16} strokeWidth={2} aria-hidden />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        placement="bottom"
        align="end"
        offset={4}
        width={224}
        label="Schedular view"
        className={styles.popover}
      >
        <div className={styles.menu} role="menu">
          {GRID_VIEWS.map((item) => (
            <ViewItem
              key={item.value}
              item={item}
              selected={gridView === item.value}
              onSelect={pickGrid}
            />
          ))}
        </div>
      </Popover>

      <div className={styles.switcher} role="radiogroup" aria-label="Content">
        <button
          type="button"
          role="radio"
          aria-checked={surface === "calendar"}
          aria-label="Schedular"
          className={cn(styles.switchBtn, surface === "calendar" && styles.switchOn)}
          onClick={() => onChange(gridView)}
        >
          <CalendarDays size={18} strokeWidth={1.9} aria-hidden />
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={surface === "itinerary"}
          aria-label="Itinerary"
          className={cn(styles.switchBtn, surface === "itinerary" && styles.switchOn)}
          onClick={() => onChange("itinerary")}
        >
          <List size={18} strokeWidth={1.9} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function ViewItem({
  item,
  selected,
  onSelect,
}: {
  item: { value: GridView; label: string; shortcut: string };
  selected: boolean;
  onSelect: (view: GridView) => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      className={cn(styles.item, selected && styles.itemOn)}
      onClick={() => onSelect(item.value)}
    >
      <span className={cn(styles.check, selected && styles.checkOn)}>
                  {selected ? <Check size={16} strokeWidth={2.4} /> : null}
      </span>
      <span className={styles.itemLabel}>{item.label}</span>
      <span className={styles.shortcut}>{item.shortcut}</span>
    </button>
  );
}

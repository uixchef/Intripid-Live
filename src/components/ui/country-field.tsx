"use client";

import { useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/controls";
import { CountryFlag } from "@/components/ui/country-flag";
import { Popover } from "@/components/ui/overlay";
import { filterCountries } from "@/data/countries";

import styles from "./country-field.module.css";

export function CountryField({
  value,
  onChange,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const listId = useId();
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => filterCountries(value), [value]);
  const show = open && !disabled && value.trim().length > 0 && matches.length > 0;

  function pick(name: string) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div ref={setAnchor} className={styles.wrap}>
      <Input
        fieldLabel="Country"
        autoComplete="off"
        value={value}
        disabled={disabled}
        invalid={invalid}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim()) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "Enter" && show && matches[0]) {
            event.preventDefault();
            pick(matches[0].name);
          }
        }}
      />
      <Popover
        open={show}
        onClose={() => setOpen(false)}
        anchor={anchor}
        placement="top"
        width={anchor?.getBoundingClientRect().width}
        label="Countries"
      >
        <ul id={listId} className={styles.list} role="listbox">
          {matches.map((country) => (
            <li key={country.iso2}>
              <button
                type="button"
                className={styles.item}
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(country.name)}
              >
                <CountryFlag
                  code={country.iso2}
                  label={country.name}
                  size={28}
                />
                <span className={styles.name}>{country.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}
